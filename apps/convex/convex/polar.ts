import { Polar } from "@convex-dev/polar";
import { api, components } from "./_generated/api";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx) => {
    const user = await ctx.runQuery(api.auth.getCurrentUser);

    return {
      userId: user?.userId ?? "",
      email: user?.email ?? "",
    };
  },
});

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
