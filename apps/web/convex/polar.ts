/** biome-ignore-all lint/style/noNonNullAssertion: always defined */
import { Polar } from "@convex-dev/polar";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx) => {
    const user = (await ctx.runQuery(internal.auth.getPolarUser)) as {
      userId: string;
      email: string;
    };

    return {
      userId: user.userId,
      email: user.email,
    };
  },
  // Named product keys — IDs come from environment variables so they are never
  // hard-coded in source. The key names here MUST match the keys defined in
  // `convex/plans.ts` (`PLAN_PRODUCT_KEYS`).
  products: {
    independiente: process.env.POLAR_PRODUCT_FREE!,
    barberiaMonthly: process.env.POLAR_PRODUCT_PRO_MONTHLY!,
    barberiaYearly: process.env.POLAR_PRODUCT_PRO_YEARLY!,
    barberiaProfMonthly: process.env.POLAR_PRODUCT_PREMIUM_MONTHLY!,
    barberiaProfYearly: process.env.POLAR_PRODUCT_PREMIUM_YEARLY!,
  },
  server: process.env.POLAR as "sandbox" | "production",
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

export const syncExistingProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});
