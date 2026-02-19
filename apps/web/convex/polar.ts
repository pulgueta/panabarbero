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
