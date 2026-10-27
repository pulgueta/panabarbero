import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAuthQuery } from ".";
import { getEntitledProductKey } from "./acl";
import { getTierForProductKey } from "./plans";
import { polar } from "./polar";
import { getProfileByUserId } from "./userProfileData";

const accessSchema = z.object({
  profile: z
    .object({
      name: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
  membership: z
    .object({
      barbershopId: zid("barbershops"),
      barbershopUuid: z.string(),
      barbershopName: z.string(),
      roles: z.enum(["owner", "barber", "staff"]).array(),
      isOwner: z.boolean(),
      isBarber: z.boolean(),
      isStaff: z.boolean(),
    })
    .nullable(),
  subscription: z
    .object({
      isActive: z.boolean(),
      tier: z.enum(["free", "pro", "premium"]).nullable(),
    })
    .nullable(),
  canEnter: z.boolean(),
});

/**
 * Backs the mobile barbershop app gate: returns, in one round trip, the
 * caller's profile, barbershop membership, and the shop owner's plan.
 *
 * This is a UX gate only. Server-side enforcement stays in `acl.ts`
 * (plan guards) and `authz.ts` (role guards).
 */
export const getAccess = zAuthQuery({
  args: z.object({}),
  returns: accessSchema,
  handler: async (ctx) => {
    const profile = await getProfileByUserId(ctx, ctx.userId);

    // Same lookup as `getByUserIdFn`, inlined to reuse the profile read above.
    const member = profile
      ? await ctx.db
          .query("barbershopMembers")
          .withIndex("by_userProfileDataId", (q) =>
            q.eq("userProfileDataId", profile._id),
          )
          .first()
      : null;

    // Inactive members are treated as non-members, like `isBarber` does.
    const barbershop = member?.isActive
      ? await ctx.db.get(member.barbershopId)
      : null;

    const profileOut = profile
      ? {
          name: profile.name ?? null,
          email: profile.email,
          image: profile.image ?? null,
        }
      : null;

    if (!member || !barbershop) {
      return {
        profile: profileOut,
        membership: null,
        subscription: null,
        canEnter: false,
      };
    }

    // Same status rule as `acl.assertIsSubscribed`: any `active`/`trialing`
    // subscription counts, including the free "independiente" product.
    const sub = await polar.getCurrentSubscription(ctx, {
      userId: barbershop.ownerId,
    });
    const isActive =
      sub !== null && (sub.status === "active" || sub.status === "trialing");

    return {
      profile: profileOut,
      membership: {
        barbershopId: barbershop._id,
        barbershopUuid: barbershop.uuid,
        barbershopName: barbershop.name,
        roles: member.roles,
        isOwner: member.roles.includes("owner"),
        isBarber: member.roles.includes("barber"),
        isStaff: member.roles.includes("staff"),
      },
      subscription: {
        isActive,
        tier: isActive
          ? getTierForProductKey(getEntitledProductKey(sub))
          : null,
      },
      canEnter: isActive,
    };
  },
});
