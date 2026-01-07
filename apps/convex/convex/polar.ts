import { Polar } from "@convex-dev/polar";
import { components } from "./_generated/api";
import type { QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

const getUserInfo = async (ctx: QueryCtx) => {
  const user = await authComponent.safeGetAuthUser(ctx);

  return {
    userId: user?.userId ?? "",
    email: user?.email ?? "",
  };
};

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx) => {
    const user = await getUserInfo(ctx);

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
