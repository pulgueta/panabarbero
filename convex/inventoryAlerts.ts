/**
 * Low-stock alert delivery — durable fan-out to the shop owner and staff
 * (members whose roles are only `barber` are excluded).
 *
 * `recordMovement`/`updateItem` detect the downward crossing (hysteresis on
 * `inventoryLevels.lowStockAlertedAt`) and only *enqueue* this workflow
 * (`startAsync`), so the inventory mutation carries none of the notification
 * load. The workflow resolves recipients, channel preferences and
 * in-app rows in a single mutation step, then dispatches each email/SMS as its
 * own retriable action step with exponential backoff.
 */

import { defineWorkflow, start } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import {
  incrementEmailSent,
  incrementSmsSent,
  isEmailLimitNotExceeded,
  isSmsLimitNotExceeded,
} from "./acl";
import { errorMessages } from "./errors";
import { buildNotificationCopy, buildSmsBody } from "./notificationCopy";
import { isNotificationEnabled, recordInApp } from "./notifications";
import type { Barbershop, InventoryItem, UserProfileData } from "./schema";
import { getProfileByUserId } from "./userProfileData";

export type LowStockAlertInput = {
  barbershopId: Barbershop["_id"];
  itemId: InventoryItem["_id"];
  itemName: string;
  remaining: number;
  unit: string;
  reorderPoint: number;
};

/**
 * Enqueue the low-stock alert workflow without running any of it inline —
 * the only piece that executes inside the calling mutation is the insert
 * into the workflow component's queue.
 */
export async function startLowStockAlert(
  ctx: MutationCtx,
  input: LowStockAlertInput,
): Promise<void> {
  await start(ctx, internal.inventoryAlerts.lowStockAlert, input, {
    startAsync: true,
  });
}

/**
 * Step 1 (mutation): resolve recipients — the owner plus every active member
 * with the `owner` or `staff` role — apply per-user channel preferences, keep
 * legacy email/SMS counters current, and persist the in-app rows.
 * Returns the concrete deliveries for the workflow to dispatch as actions.
 */
export const prepareLowStockAlert = zInternalMutation({
  args: z.object({
    barbershopId: zid("barbershops"),
    itemId: zid("inventoryItems"),
    itemName: z.string(),
    remaining: z.number(),
    unit: z.string(),
    reorderPoint: z.number(),
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
    const emails: string[] = [];
    const smsTargets: string[] = [];

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

      if (
        isNotificationEnabled("email", profile.notificationsPreferences) &&
        profile.email &&
        (await isEmailLimitNotExceeded(ctx, barbershop._id))
      ) {
        await incrementEmailSent(ctx, barbershop._id);
        emails.push(profile.email);
      }

      if (
        isNotificationEnabled("sms", profile.notificationsPreferences) &&
        profile.phoneNumber &&
        (await isSmsLimitNotExceeded(ctx, barbershop._id))
      ) {
        await incrementSmsSent(ctx, barbershop._id);
        smsTargets.push(profile.phoneNumber);
      }
    }

    return {
      barbershopName: barbershop.name,
      smsBody: buildSmsBody(copy),
      emails,
      smsTargets,
    };
  },
});

export const lowStockAlert = defineWorkflow(components.workflow, {
  args: {
    barbershopId: v.id("barbershops"),
    itemId: v.id("inventoryItems"),
    itemName: v.string(),
    remaining: v.number(),
    unit: v.string(),
    reorderPoint: v.number(),
  },
  workpoolOptions: {
    retryActionsByDefault: true,
    defaultRetryBehavior: {
      maxAttempts: 4,
      initialBackoffMs: 1_000,
      base: 2,
    },
  },
}).handler(async (step, args) => {
  const delivery = await step.runMutation(
    internal.inventoryAlerts.prepareLowStockAlert,
    args,
  );

  await Promise.all([
    ...delivery.emails.map((to) =>
      step.runAction(
        internal.emails.sendLowStockEmail,
        {
          to,
          itemName: args.itemName,
          remaining: args.remaining,
          unit: args.unit,
          reorderPoint: args.reorderPoint,
          barbershopName: delivery.barbershopName,
        },
        { name: `email:${to}` },
      ),
    ),
    ...delivery.smsTargets.map((to) =>
      step.runAction(
        internal.twilio.sendSms,
        { to, body: delivery.smsBody },
        { name: `sms:${to}` },
      ),
    ),
  ]);
});
