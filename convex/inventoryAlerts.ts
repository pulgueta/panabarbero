/**
 * Low-stock alert delivery — fan-out to the shop owner and staff (members
 * whose roles are only `barber` are excluded).
 *
 * `recordMovement`/`updateItem` detect the downward crossing (hysteresis on
 * `inventoryLevels.lowStockAlertedAt`) and only *enqueue* `sendLowStockAlert`
 * (`scheduler.runAfter(0)`), so the inventory mutation carries none of the
 * notification load. That mutation resolves recipients, writes the in-app
 * rows and hands each recipient to `sendNotification` (WhatsApp, else the
 * email + SMS fallback — see `notifications.ts`).
 */

import { ConvexError } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zInternalMutation } from ".";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { inventoryTriggers } from "./aggregates";
import { errorMessages } from "./errors";
import {
  buildNotificationCopy,
  buildSmsBody,
  inventoryUnitLabels,
} from "./notificationCopy";
import { emailFallback, recordInApp, sendNotification } from "./notifications";
import type {
  Barbershop,
  InventoryItem,
  InventoryLevel,
  UserProfileData,
} from "./schema";
import { getProfileByUserId } from "./userProfileData";
import { formatPhoneNumber } from "./utils";
import { buildInventoryLowStock } from "./whatsappTemplates";

export type LowStockAlertInput = {
  barbershopId: Barbershop["_id"];
  itemId: InventoryItem["_id"];
  itemName: string;
  remaining: number;
  unit: string;
  reorderPoint: number;
  levelId: InventoryLevel["_id"];
  /** The `lowStockAlertedAt` stamp this alert (and its ack button) is bound to. */
  alertedAt: number;
};

/**
 * Enqueue the alert without running any of it inline — the calling
 * inventory mutation only schedules `sendLowStockAlert`.
 */
export async function startLowStockAlert(
  ctx: MutationCtx,
  input: LowStockAlertInput,
): Promise<void> {
  await ctx.scheduler.runAfter(
    0,
    internal.inventoryAlerts.sendLowStockAlert,
    input,
  );
}

/**
 * Resolve recipients — the owner plus every active member with the `owner`
 * or `staff` role — persist the in-app rows and send one notification per
 * recipient.
 */
export const sendLowStockAlert = zInternalMutation({
  args: z.object({
    barbershopId: zid("barbershops"),
    itemId: zid("inventoryItems"),
    itemName: z.string(),
    remaining: z.number(),
    unit: z.string(),
    reorderPoint: z.number(),
    levelId: zid("inventoryLevels"),
    alertedAt: z.number(),
  }),
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    const recipients = new Map<string, UserProfileData>();
    const ownerProfile = await getProfileByUserId(ctx, barbershop.ownerId);

    if (ownerProfile) {
      recipients.set(ownerProfile.userId, ownerProfile);
    }

    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    for (const member of members) {
      const isStaff =
        member.isActive &&
        member.roles.some((role) => role === "owner" || role === "staff");

      if (!isStaff) {
        continue;
      }

      const profile = await ctx.db.get(member.userProfileDataId);

      if (profile && !recipients.has(profile.userId)) {
        recipients.set(profile.userId, profile);
      }
    }

    if (recipients.size === 0) {
      throw new ConvexError(errorMessages.notFound("destinatarios"));
    }

    const copy = buildNotificationCopy({
      kind: "low_stock",
      itemName: args.itemName,
      remaining: args.remaining,
      unit: args.unit,
      reorderPoint: args.reorderPoint,
      barbershopName: barbershop.name,
    });
    const smsBody = buildSmsBody(copy);
    const template = buildInventoryLowStock({
      itemName: args.itemName,
      barbershopName: barbershop.name,
      remaining: args.remaining,
      unitLabel: inventoryUnitLabels.get(args.unit) ?? args.unit,
      reorderPoint: args.reorderPoint,
      levelId: args.levelId,
      alertedAt: args.alertedAt,
    });

    for (const profile of recipients.values()) {
      await recordInApp(ctx, {
        userId: profile.userId,
        copy,
        payload: {
          barbershopId: barbershop._id,
          barbershopName: barbershop.name,
          itemName: args.itemName,
          itemUnit: args.unit,
          remaining: args.remaining,
        },
      });

      await sendNotification(ctx, {
        barbershopId: barbershop._id,
        phone: profile.phoneNumber,
        receiverProfile: profile,
        template,
        email: profile.email
          ? await emailFallback(internal.emails.sendLowStockEmail, {
              to: profile.email,
              itemName: args.itemName,
              remaining: args.remaining,
              unit: args.unit,
              reorderPoint: args.reorderPoint,
              barbershopName: barbershop.name,
            })
          : undefined,
        smsBody,
      });
    }
  },
});

/**
 * "Ya hice el pedido" quick reply. Phone-authed: the sender must be the shop
 * owner or an active owner/staff member. The payload binds to the exact
 * `lowStockAlertedAt` stamp, so a tap on an old alert (already recovered or
 * re-crossed) is rejected. Never throws — the caller words a reply off the
 * boolean.
 */
export const ackLowStockFromWhatsApp = zInternalMutation({
  args: z.object({
    levelId: zid("inventoryLevels"),
    alertedAt: z.number(),
    senderPhone: z.string(),
  }),
  handler: async (ctx, args) => {
    const level = await ctx.db.get(args.levelId);

    if (!level || level.lowStockAlertedAt !== args.alertedAt) {
      return false;
    }

    const barbershop = await ctx.db.get(level.barbershopId);

    if (!barbershop) {
      return false;
    }

    const sender = formatPhoneNumber(args.senderPhone);

    if (!sender) {
      return false;
    }

    let authorized = false;
    const ownerProfile = await getProfileByUserId(ctx, barbershop.ownerId);

    if (
      ownerProfile?.phoneNumber &&
      formatPhoneNumber(ownerProfile.phoneNumber) === sender
    ) {
      authorized = true;
    }

    if (!authorized) {
      const members = await ctx.db
        .query("barbershopMembers")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", level.barbershopId),
        )
        .collect();

      for (const member of members) {
        const isStaff =
          member.isActive &&
          member.roles.some((role) => role === "owner" || role === "staff");

        if (!isStaff) {
          continue;
        }

        const profile = await ctx.db.get(member.userProfileDataId);

        if (
          profile?.phoneNumber &&
          formatPhoneNumber(profile.phoneNumber) === sender
        ) {
          authorized = true;
          break;
        }
      }
    }

    if (!authorized) {
      return false;
    }

    if (level.lowStockAckedAt !== undefined) {
      return true; // Already acked — idempotent for webhook retries
    }

    // Every `inventoryLevels` write goes through the wrapped db (aggregate
    // mandate) even though this field doesn't affect any sumValue.
    await inventoryTriggers
      .wrapDB(ctx)
      .db.patch(level._id, { lowStockAckedAt: Date.now() });

    return true;
  },
});
