import { Migrations } from "@convex-dev/migrations";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import type { DataModel, Id } from "./_generated/dataModel.js";
import { internalMutation } from "./_generated/server.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

// =============================================================================
// Organization Migration Functions (Run manually via Convex dashboard)
// =============================================================================

/**
 * Migration: Create organizations for existing barbershop owners
 *
 * Run this mutation multiple times until it returns { done: true }
 *
 * This migration:
 * 1. Finds all barbershops without an organizationId
 * 2. Creates an organization for each unique owner
 * 3. Links the barbershop to the organization
 * 4. Creates organization membership for the owner
 */
export const migrateToOrganizationsBatch = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 10;

    // Find barbershops without organizationId
    const barbershops = await ctx.db
      .query("barbershops")
      .filter((q) => q.eq(q.field("organizationId"), undefined))
      .take(batchSize);

    if (barbershops.length === 0) {
      return { done: true, migrated: 0, message: "Migration complete!" };
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const barbershop of barbershops) {
      try {
        // Get the owner's user record
        const user = await ctx.db
          .query("user")
          .withIndex("userId", (q) => q.eq("userId", barbershop.ownerId))
          .unique();

        if (!user) {
          errors.push(
            `User not found for barbershop ${barbershop._id}, owner: ${barbershop.ownerId}`,
          );
          continue;
        }

        // Check if user already has an organization
        let organizationId: Id<"organization"> | null = null;

        const existingMembership = await ctx.db
          .query("member")
          .filter((q) => q.eq(q.field("userId"), user._id))
          .first();

        if (existingMembership) {
          // Use existing organization
          organizationId =
            existingMembership.organizationId as Id<"organization">;
        } else {
          // Create new organization
          const orgSlug = `${barbershop.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

          const newOrgId = await ctx.db.insert("organization", {
            name: barbershop.name,
            slug: orgSlug,
            logo: barbershop.bannerUrl ?? null,
            metadata: null,
            createdAt: Date.now(),
          });

          organizationId = newOrgId;

          // Create owner membership in organization
          await ctx.db.insert("member", {
            organizationId: newOrgId,
            userId: user._id,
            role: "owner",
            createdAt: Date.now(),
          });
        }

        // Update barbershop with organizationId
        await ctx.db.patch(barbershop._id, {
          organizationId: organizationId,
        });

        migrated++;
      } catch (error) {
        errors.push(`Error migrating barbershop ${barbershop._id}: ${error}`);
      }
    }

    return {
      done: false,
      migrated,
      remaining: barbershops.length - migrated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Migrated ${migrated} barbershops. Run again for more.`,
    };
  },
});

/**
 * Migration: Add userId to existing barbershopMembers
 *
 * Run this mutation multiple times until it returns { done: true }
 *
 * This migration:
 * 1. Finds barbershopMembers without userId
 * 2. Looks up the userId from userProfileData
 * 3. Updates the member record with userId
 */
export const migrateBarbershopMembersUserIdBatch = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;

    // Find members without userId
    const members = await ctx.db
      .query("barbershopMembers")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .take(batchSize);

    if (members.length === 0) {
      return { done: true, migrated: 0, message: "Migration complete!" };
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const member of members) {
      try {
        const userProfile = await ctx.db.get(member.userProfileDataId);

        if (!userProfile) {
          errors.push(`UserProfile not found for member ${member._id}`);
          continue;
        }

        // Get the barbershop to find organizationId
        const barbershop = await ctx.db.get(member.barbershopId);
        const organizationId = barbershop?.organizationId;

        await ctx.db.patch(member._id, {
          userId: userProfile.userId,
          organizationId: organizationId ?? undefined,
        });

        migrated++;
      } catch (error) {
        errors.push(`Error migrating member ${member._id}: ${error}`);
      }
    }

    return {
      done: false,
      migrated,
      remaining: members.length - migrated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Migrated ${migrated} members. Run again for more.`,
    };
  },
});

/**
 * Helper: Count items remaining to migrate
 */
export const getMigrationStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const barbershopsToMigrate = await ctx.db
      .query("barbershops")
      .filter((q) => q.eq(q.field("organizationId"), undefined))
      .collect();

    const membersToMigrate = await ctx.db
      .query("barbershopMembers")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();

    return {
      barbershopsWithoutOrg: barbershopsToMigrate.length,
      membersWithoutUserId: membersToMigrate.length,
      migrationComplete:
        barbershopsToMigrate.length === 0 && membersToMigrate.length === 0,
    };
  },
});
