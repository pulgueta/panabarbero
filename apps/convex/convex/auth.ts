import { expo } from "@better-auth/expo";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

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
      },
      onDelete: async (ctx, doc) => {
        const profile = await ctx.runQuery(
          internal.userProfileData.getProfileByUserId,
          {
            userId: doc.userId ?? "",
          },
        );

        if (!profile) {
          throw new Error("Profile not found", {
            cause: doc.userId,
          });
        }

        await ctx.runMutation(internal.userProfileData.deleteProfile, {
          profileId: profile._id,
        });
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

const siteUrl = process.env.SITE_URL ?? "";
const previewSiteUrl = process.env.PREVIEW_SITE_URL ?? "";

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    trustedOrigins: ["panabarbero://", siteUrl, previewSiteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
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
      twoFactor(),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
