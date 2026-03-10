import { passkey } from "@better-auth/passkey";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth/minimal";
import { twoFactor } from "better-auth/plugins";
import { z } from "zod";

import { zInternalAction, zQuery } from ".";
import { APP_NAME } from "../src/config";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { from, resend } from "./emails";
import { getLimitsForProductKey, getTierForProductKey } from "./plans";
import { polar } from "./polar";
import { getProfileByUserId } from "./userProfileData";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, doc) => {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            update: {
              userId: doc._id,
            },
            where: [{ field: "_id", operator: "eq", value: doc._id }],
          },
        });

        await ctx.runMutation(internal.userProfileData.create, {
          email: doc.email,
          userId: doc._id,
          name: doc.name,
          phoneNumber: undefined,
          notificationsPreferences: [
            {
              type: "email",
              enabled: true,
            },
          ],
        });
      },
      onDelete: async (ctx, doc) => {
        let profile = null;

        if (doc.userId) {
          profile = await getProfileByUserId(ctx, doc.userId);
        }

        if (!profile) {
          return;
        }

        await ctx.runMutation(internal.userProfileData.deleteProfile, {
          id: profile._id,
        });
      },
      onUpdate: async (ctx, doc) => {
        if (doc.image) {
          await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
              model: "user",
              update: {
                image: doc.image,
              },
              where: [{ field: "_id", operator: "eq", value: doc._id }],
            },
          });
        }
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
export const { getAuthUser } = authComponent.clientApi();

const siteUrl = process.env.SITE_URL ?? "";

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    appName: APP_NAME,
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 4,
      maxPasswordLength: 255,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, token }) => {
        await resend.sendEmail(requireActionCtx(ctx), {
          from,
          to: user.email,
          template: {
            id: "password-reset",
            variables: {
              TOKEN: token,
            },
          },
        });
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ token, user }) => {
        const verificationUrl = new URL("/verify-email", siteUrl);
        verificationUrl.searchParams.set("token", token);

        await resend.sendEmail(requireActionCtx(ctx), {
          from,
          to: user.email,
          template: {
            id: "email-verification",
            variables: {
              VERIFICATION_URL: verificationUrl.toString(),
            },
          },
        });
      },
      afterEmailVerification: async (user) => {
        await resend.sendEmail(requireActionCtx(ctx), {
          from,
          to: user.email,
          template: {
            id: "welcome-onboarding",
          },
        });
      },
    },
    telemetry: {
      enabled: false,
    },
    rateLimit: {
      storage: "memory",
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: true,
      },
    },
    plugins: [
      convex({ authConfig, jwks: process.env.JWKS }),
      passkey(),
      twoFactor({
        issuer: APP_NAME,
      }),
    ],
  });
};

export const getCurrentUser = zQuery({
  args: z.object({}),
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

export const getUserSubscription = zQuery({
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return null;
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user.userId,
    });

    const planTier = getTierForProductKey(subscription?.productKey);
    const planLimits = getLimitsForProductKey(subscription?.productKey);

    return {
      ...subscription,
      isSubscribed:
        subscription?.status === "active" ||
        subscription?.status === "trialing",
      productPlanId: subscription?.productId,
      planTier,
      planLimits,
      // Backward-compatible boolean helpers
      isFree: planTier === "free",
      isPro: planTier === "pro",
      isPremium: planTier === "premium",
    };
  },
});

function toConvexSafeValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export const getLatestJwks = zInternalAction({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);

    return toConvexSafeValue(await auth.api.getLatestJwks());
  },
});
