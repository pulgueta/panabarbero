import { passkey } from "@better-auth/passkey";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

import { APP_NAME } from "../src/config";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { internalAction, internalQuery, query } from "./_generated/server";
import authConfig from "./auth.config";
import { from, resend } from "./emails";
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
          data: {
            name: doc.name,
            userId: doc._id,
            uuid: crypto.randomUUID(),
            email: doc.email,
            phoneNumber: doc.phoneNumber ?? undefined,
            notificationsPreferences: [
              {
                type: "email",
                enabled: true,
              },
              {
                type: "sms",
                enabled: false,
              },
            ],
          },
        });
      },
      onDelete: async (ctx, doc) => {
        const profile = await getProfileByUserId(ctx, doc.userId ?? "");

        if (!profile) {
          return;
        }

        await ctx.runMutation(internal.userProfileData.deleteProfile, {
          profileId: profile._id,
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

const siteUrl = process.env.SITE_URL ?? "";

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    appName: APP_NAME,
    trustedOrigins: [siteUrl],
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
      convex({ authConfig, jwksRotateOnTokenGenerationError: true }),
      crossDomain({ siteUrl }),
      passkey(),
      twoFactor({
        issuer: APP_NAME,
      }),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

export const getPolarUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, user.userId);

    if (!profile) {
      return null;
    }

    return {
      userId: user._id,
      email: profile.email,
    };
  },
});

export const getLatestJwks = internalAction({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);

    return await auth.api.getLatestJwks();
  },
});

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return null;
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user.userId,
    });

    return subscription;
  },
});
