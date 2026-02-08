// IMPORTANT: Import polyfills FIRST before any Polar imports
import "./lib/polarPolyfills";

import { passkey } from "@better-auth/passkey";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { APP_NAME } from "@panabarbero/constants";
import { polar, portal, webhooks } from "@polar-sh/better-auth";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { organization, twoFactor } from "better-auth/plugins";
import {
  type AuthFunctions,
  createApi,
  createClient,
  getAuthUserIdentity,
  getHeaders,
} from "better-convex/auth";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import authConfig from "./auth.config";
import { from, resend } from "./emails";
import { errorMessages } from "./errors";
import { getPolarClient } from "./lib/polarClient";
import { convertToDatabaseSubscription } from "./lib/polarHelpers";
import schema from "./schema";
import { getProfileByUserId } from "./userProfileData";

type GenericCtx = QueryCtx | MutationCtx | ActionCtx;

const authFunctions: AuthFunctions = internal.auth;
const siteUrl = process.env.SITE_URL ?? "";

export const authClient = createClient<DataModel, typeof schema>({
  authFunctions,
  schema,
  internalMutation,
  triggers: {
    user: {
      beforeCreate: async (_ctx, data) => ({
        ...data,
        userId: data.userId ?? crypto.randomUUID(),
      }),
      onCreate: async (ctx, user) => {
        const userId = user.userId ?? crypto.randomUUID();

        // Create user profile data
        await ctx.runMutation(internal.userProfileData.create, {
          data: {
            name: user.name,
            userId,
            uuid: crypto.randomUUID(),
            email: user.email,
            phoneNumber: undefined,
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

        // Create Polar customer via scheduler (non-blocking)
        await ctx.scheduler.runAfter(
          0,
          internal.polarSubscriptions.createPolarCustomer,
          {
            email: user.email,
            name: user.name,
            userId,
          },
        );
      },
      onDelete: async (ctx, user) => {
        const profile = await getProfileByUserId(ctx, user.userId ?? "");

        if (!profile) {
          return;
        }

        await ctx.runMutation(internal.userProfileData.deleteProfile, {
          profileId: profile._id,
        });
      },
      onUpdate: async (ctx, user) => {
        if (!user.image) {
          return;
        }

        await ctx.runMutation(internal.auth.updateOne, {
          input: {
            model: "user",
            update: {
              image: user.image,
            },
            where: [{ field: "_id", operator: "eq", value: user._id }],
          },
        });
      },
    },
  },
});

const createAuthOptions = (ctx: GenericCtx) =>
  ({
    appName: APP_NAME,
    trustedOrigins: [siteUrl],
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
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
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
      crossDomain({ siteUrl }),
      passkey(),
      twoFactor({
        issuer: APP_NAME,
      }),
      // Organization plugin for multi-tenancy
      organization({
        allowUserToCreateOrganization: true,
        // Send invitation email when inviting members to org
        sendInvitationEmail: async (data) => {
          const inviteLink = `${siteUrl}/org-invitation/${data.id}`;
          await resend.sendEmail(requireActionCtx(ctx), {
            from,
            to: data.email,
            template: {
              id: "org-invitation",
              variables: {
                ORGANIZATION_NAME: data.organization.name,
                INVITER_NAME: data.inviter.user.name ?? data.inviter.user.email,
                INVITE_LINK: inviteLink,
              },
            },
          });
        },
      }),
      // Polar plugin for subscriptions
      // Note: Products are fetched dynamically via getPolarProducts()
      // Configure checkout products at runtime in the HTTP handler
      polar({
        client: getPolarClient(),
        // Customer creation handled via trigger (see user.onCreate)
        use: [
          portal(),
          webhooks({
            secret: process.env.POLAR_WEBHOOK_SECRET!,
            onCustomerCreated: async (payload) => {
              const userId = payload?.data.externalId;
              if (!userId) return;

              await (ctx as ActionCtx).runMutation(
                internal.polarSubscriptions.updateUserCustomerId,
                { customerId: payload.data.id, userId },
              );
            },
            onSubscriptionCreated: async (payload) => {
              if (!payload.data.customer.externalId) return;

              await (ctx as ActionCtx).runMutation(
                internal.polarSubscriptions.createSubscription,
                { subscription: convertToDatabaseSubscription(payload.data) },
              );
            },
            onSubscriptionUpdated: async (payload) => {
              if (!payload.data.customer.externalId) return;

              await (ctx as ActionCtx).runMutation(
                internal.polarSubscriptions.updateSubscription,
                { subscription: convertToDatabaseSubscription(payload.data) },
              );
            },
            onSubscriptionCanceled: async (payload) => {
              if (!payload.data.customer.externalId) return;

              await (ctx as ActionCtx).runMutation(
                internal.polarSubscriptions.handleCancellation,
                { subscriptionId: payload.data.id },
              );
            },
          }),
        ],
      }),
    ],
    database: authClient.httpAdapter(ctx),
  }) satisfies BetterAuthOptions;

export const getAuth = <Ctx extends QueryCtx | MutationCtx>(ctx: Ctx) =>
  betterAuth({
    ...createAuthOptions(ctx),
    database: authClient.adapter(ctx, createAuthOptions),
  });

export const createAuth = (ctx: ActionCtx) =>
  betterAuth(createAuthOptions(ctx));

export const {
  create,
  deleteMany,
  deleteOne,
  findMany,
  findOne,
  updateMany,
  updateOne,
  getLatestJwks,
  rotateKeys,
} = createApi(schema, createAuth, {
  internalMutation,
});

export const {
  beforeCreate,
  beforeDelete,
  beforeUpdate,
  onCreate,
  onDelete,
  onUpdate,
} = authClient.triggersApi();

// biome-ignore lint/suspicious/noExplicitAny: Required for Better Auth CLI
export const auth = betterAuth(createAuthOptions({} as any));

export const getSafeAuthUser = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await getAuthUserIdentity(ctx);

  if (!identity) {
    return null;
  }

  return await ctx.db.get(identity.userId as Id<"user">);
};

export const getAuthUser = async (ctx: QueryCtx | MutationCtx) => {
  const user = await getSafeAuthUser(ctx);

  if (!user) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  return user;
};

export const authComponent = {
  getAuthUser,
  safeGetAuthUser: getSafeAuthUser,
  getAuth: async (_createAuth: unknown, ctx: QueryCtx | MutationCtx) => {
    const headers = await getHeaders(ctx);
    const auth = getAuth(ctx);
    return { auth, headers };
  },
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getSafeAuthUser(ctx);
  },
});

export const getPolarUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getSafeAuthUser(ctx);

    if (!user?.userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, user.userId);

    if (!profile) {
      return null;
    }

    return {
      userId: profile.userId,
      email: profile.email,
    };
  },
});
