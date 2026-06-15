/** biome-ignore-all lint/style/noNonNullAssertion: always defined */
import { Polar } from "@convex-dev/polar";
import { z } from "zod";

import { zInternalAction } from ".";
import { api, components } from "./_generated/api";
import { CREDIT_PRODUCT_KEYS, PLAN_PRODUCT_KEYS } from "./plans";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx) => {
    const user = (await ctx.runQuery(api.auth.getCurrentUser, {})) as {
      id: string;
      email: string;
    };

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

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getConfiguredProducts,
  listAllProducts,
  listAllSubscriptions,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();

export const syncExistingProducts = zInternalAction({
  args: z.object({}),
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});
