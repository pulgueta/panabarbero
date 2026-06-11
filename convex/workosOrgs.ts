import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zInternalAction } from ".";
import { internal } from "./_generated/api";
import { trackException } from "./analytics";
import { authkit } from "./auth.config";

/**
 * WorkOS Organization lifecycle sync. Barbershops are the source of truth:
 * every action swallows WorkOS failures (reported to PostHog) so org sync
 * never breaks a user-facing flow.
 */

export const createOrganizationForBarbershop = zInternalAction({
  args: z.object({
    barbershopId: zid("barbershops"),
    name: z.string(),
    ownerUserId: z.string(),
  }),
  handler: async (ctx, args) => {
    try {
      const organization =
        await authkit.workos.organizations.createOrganization({
          name: args.name,
          externalId: args.barbershopId,
          metadata: { barbershopId: args.barbershopId },
        });

      await authkit.workos.userManagement.createOrganizationMembership({
        organizationId: organization.id,
        userId: args.ownerUserId,
      });

      await ctx.runMutation(internal.barbershops.setWorkosOrganizationId, {
        id: args.barbershopId,
        workosOrganizationId: organization.id,
      });
    } catch (error) {
      await trackException(ctx, error, args.ownerUserId, {
        scope: "workos_org_sync",
        operation: "create",
        barbershopId: args.barbershopId,
      });
    }
  },
});

export const renameOrganization = zInternalAction({
  args: z.object({
    workosOrganizationId: z.string(),
    name: z.string(),
  }),
  handler: async (ctx, args) => {
    try {
      await authkit.workos.organizations.updateOrganization({
        organization: args.workosOrganizationId,
        name: args.name,
      });
    } catch (error) {
      await trackException(ctx, error, undefined, {
        scope: "workos_org_sync",
        operation: "rename",
        workosOrganizationId: args.workosOrganizationId,
      });
    }
  },
});

export const deleteOrganization = zInternalAction({
  args: z.object({
    workosOrganizationId: z.string(),
  }),
  handler: async (ctx, args) => {
    try {
      await authkit.workos.organizations.deleteOrganization(
        args.workosOrganizationId,
      );
    } catch (error) {
      // Already gone in WorkOS — nothing to report.
      if ((error as { status?: number }).status === 404) {
        return;
      }

      await trackException(ctx, error, undefined, {
        scope: "workos_org_sync",
        operation: "delete",
        workosOrganizationId: args.workosOrganizationId,
      });
    }
  },
});
