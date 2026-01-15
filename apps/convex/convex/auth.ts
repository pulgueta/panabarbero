import { expo } from "@better-auth/expo";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { APP_NAME } from "@panabarbero/constants";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { getProfileByUserId } from "./userProfileData";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, doc) => {
        const userIdUuid = crypto.randomUUID();

        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            update: {
              userId: userIdUuid,
            },
            where: [{ field: "_id", operator: "eq", value: doc._id }],
          },
        });

        await ctx.runMutation(internal.userProfileData.createProfile, {
          data: {
            name: doc.name,
            userId: userIdUuid,
            uuid: crypto.randomUUID(),
            email: doc.email,
            phoneNumber: doc.phoneNumber ?? undefined,
            notificationsPreferences: [
              {
                type: "email",
                enabled: true,
              },
              {
                type: "push",
                enabled: false,
              },
              {
                type: "sms",
                enabled: false,
              },
            ],
          },
        });

        await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
          to: doc.email,
        });
      },
      onDelete: async (ctx, doc) => {
        if (!doc.userId) {
          return;
        }

        const profile = await getProfileByUserId(ctx, doc.userId);

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

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    appName: APP_NAME,
    baseURL: siteUrl,
    trustedOrigins: ["panabarbero://", siteUrl, "http://localhost:3000"],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 4,
      maxPasswordLength: 255,
      sendResetPassword: async ({ token, url, user }) => {},
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: true,
      },
    },
    plugins: [
      expo(),
      convex(),
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
