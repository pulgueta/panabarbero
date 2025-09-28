import { expo } from "@better-auth/expo";
import type { GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const authComponent = createClient<DataModel>(components.betterAuth);

const siteUrl = process.env.WEB_URL ?? "";

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    trustedOrigins: ["panabarbero://", siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    plugins: [expo(), convex(), crossDomain({ siteUrl })],
  });
};

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    // biome-ignore lint/suspicious/noExplicitAny: WIP
    return await authComponent.getAuthUser(ctx as any);
  },
});
