/** biome-ignore-all lint/style/noNonNullAssertion: always defined */
import { Polar } from "@convex-dev/polar";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthAction, zInternalAction } from ".";
import { api, components } from "./_generated/api";
import { errorMessages } from "./errors";
import { CREDIT_PRODUCT_KEYS, PLAN_PRODUCT_KEYS } from "./plans";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx) => {
    // The cast breaks the polar → api.auth → acl → polar type cycle; `| null`
    // keeps the unauthenticated case honest.
    const user = (await ctx.runQuery(api.auth.getCurrentUser, {})) as {
      id: string;
      email: string;
    } | null;

    if (!user?.email) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    return {
      userId: user.id,
      email: user.email,
    };
  },
  // Named product keys — IDs come from environment variables so they are never
  // hard-coded in source. The key names here MUST match the keys defined in
  // `convex/plans.ts` (`PLAN_PRODUCT_KEYS` + `CREDIT_PRODUCT_KEYS`).
  products: {
    [PLAN_PRODUCT_KEYS[0]]: process.env.POLAR_PRODUCT_FREE!,
    [PLAN_PRODUCT_KEYS[1]]: process.env.POLAR_PRODUCT_PRO_MONTHLY!,
    [PLAN_PRODUCT_KEYS[2]]: process.env.POLAR_PRODUCT_PRO_YEARLY!,
    [PLAN_PRODUCT_KEYS[3]]: process.env.POLAR_PRODUCT_PREMIUM_MONTHLY!,
    [PLAN_PRODUCT_KEYS[4]]: process.env.POLAR_PRODUCT_PREMIUM_YEARLY!,
    // One-time credit products
    [CREDIT_PRODUCT_KEYS[0]]: process.env.POLAR_PRODUCT_EXTRA_SMS!,
    [CREDIT_PRODUCT_KEYS[1]]: process.env.POLAR_PRODUCT_EXTRA_EMAIL!,
  },
});

export const { getConfiguredProducts, generateCustomerPortalUrl } = polar.api();

/**
 * Authenticated replacement for the component's `generateCheckoutLink`. The
 * `order.paid` webhook resolves which barbershop to credit from
 * `metadata.userId`, so that value is set here — server-side, from the
 * authenticated caller — and never accepted from the client.
 */
export const generateCheckoutLink = zAuthAction({
  args: z.object({
    productIds: z.array(z.string()),
    origin: z.string(),
    successUrl: z.string(),
    locale: z.string().optional(),
    // Accepted for `<CheckoutLink>` API compatibility; `metadata` is
    // deliberately ignored — see the doc comment above.
    subscriptionId: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    trialInterval: z.string().nullable().optional(),
    trialIntervalCount: z.number().nullable().optional(),
  }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    const user = (await ctx.runQuery(api.auth.getCurrentUser, {})) as {
      email: string;
    } | null;

    if (!user?.email) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const { url } = await polar.createCheckoutSession(ctx, {
      productIds: args.productIds,
      userId: ctx.userId,
      email: user.email,
      origin: args.origin,
      successUrl: args.successUrl,
      metadata: { userId: ctx.userId },
    });

    if (!args.locale) {
      return { url };
    }

    const localized = new URL(url);
    localized.searchParams.set("locale", args.locale);
    return { url: localized.toString() };
  },
});

export const syncExistingProducts = zInternalAction({
  args: z.object({}),
  handler: async (ctx) => {
    const missing = Object.entries(polar.products)
      .filter(([, productId]) => !productId)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error(
        `[polar] faltan los IDs de producto en el entorno para: ${missing.join(", ")}`,
      );
    }

    await polar.syncProducts(ctx);
  },
});
