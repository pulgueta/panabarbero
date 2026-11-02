import { ConvexError } from "convex/values";

import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { errorMessages } from "./errors";

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

/** WorkOS user id (`user_…`, the JWT subject) for the caller, or `null` when unauthenticated. */
export async function getUserId(ctx: AuthCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();

  return identity?.subject ?? null;
}

/** Like {@link getUserId} but throws when the caller is unauthenticated. */
export async function requireUserId(ctx: AuthCtx): Promise<string> {
  const userId = await getUserId(ctx);

  if (!userId) {
    throw new ConvexError(errorMessages.unauthorized);
  }

  return userId;
}
