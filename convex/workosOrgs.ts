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

      // Persist the link immediately so a later membership failure can't orphan
      // the WorkOS org (rename/delete/deactivate flows only run when the
      // barbershop has a workosOrganizationId). The invite path also recovers
      // this via getOrganizationByExternalId.
      await ctx.runMutation(internal.barbershops.setWorkosOrganizationId, {
        id: args.barbershopId,
        workosOrganizationId: organization.id,
      });

      await authkit.workos.userManagement.createOrganizationMembership({
        organizationId: organization.id,
        userId: args.ownerUserId,
        roleSlug: "admin",
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

/**
 * Remove a user's membership(s) from a barbershop's WorkOS organization when
 * they are removed from the team in-app — keeps WorkOS free of ghost members so
 * the email can be re-invited later. Tolerant of already-gone memberships.
 */
export const removeOrganizationMembership = zInternalAction({
  args: z.object({
    workosOrganizationId: z.string(),
    userId: z.string(),
  }),
  handler: async (ctx, args) => {
    try {
      const memberships =
        await authkit.workos.userManagement.listOrganizationMemberships({
          organizationId: args.workosOrganizationId,
          userId: args.userId,
          statuses: ["active", "inactive", "pending"],
        });

      await Promise.all(
        memberships.data.map((membership) =>
          authkit.workos.userManagement.deleteOrganizationMembership(
            membership.id,
          ),
        ),
      );
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return;
      }

      await trackException(ctx, error, args.userId, {
        scope: "workos_org_sync",
        operation: "remove_membership",
        workosOrganizationId: args.workosOrganizationId,
      });
    }
  },
});
