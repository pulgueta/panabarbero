import type { ActionCtx, MutationCtx } from "./_generated/server";
import { posthog } from "./posthog";

/** Contexts that can schedule — PostHog capture is fire-and-forget via the scheduler. */
type AnalyticsCtx = MutationCtx | ActionCtx;

// Payload types come from the PostHog component client: it owns the contract.
type CaptureArgs = Parameters<typeof posthog.capture>[1];
type IdentifyArgs = Parameters<typeof posthog.identify>[1];
type GroupIdentifyArgs = Parameters<typeof posthog.groupIdentify>[1];
type CaptureExceptionArgs = Parameters<typeof posthog.captureException>[1];

export type AppEventName =
  | "user_signed_up"
  | "appointment_created"
  | "appointment_completed"
  | "appointment_no_show"
  | "appointment_cancelled"
  | "appointment_reschedule_requested"
  | "appointment_reschedule_decided"
  | "barbershop_created"
  | "service_created"
  | "member_invited"
  | "member_joined"
  | "ai_thread_started"
  | "ai_action_confirmed"
  | "review_invite_sent"
  | "review_created"
  | "review_published"
  | "review_flagged"
  | "review_updated"
  | "review_deleted"
  | "inventory_item_created"
  | "inventory_item_archived"
  | "stock_received"
  | "stock_adjusted"
  | "stock_consumed"
  | "stock_reserved"
  | "product_sold";

/** Capture a product event. No-op when there is no distinct id to attribute it to. */
export async function track(
  ctx: AnalyticsCtx,
  args: {
    distinctId: string | null | undefined;
    event: AppEventName;
    properties?: CaptureArgs["properties"];
    groups?: Record<string, string | number>;
  },
): Promise<void> {
  if (!args.distinctId) {
    return;
  }

  await posthog.capture(ctx, {
    distinctId: args.distinctId,
    event: args.event,
    properties: args.properties,
    groups: args.groups,
  });
}

export async function identifyUser(
  ctx: AnalyticsCtx,
  distinctId: string,
  properties?: IdentifyArgs["properties"],
): Promise<void> {
  await posthog.identify(ctx, { distinctId, properties });
}

/** Register or update barbershop group properties in PostHog. */
export async function groupIdentifyBarbershop(
  ctx: AnalyticsCtx,
  barbershopId: string,
  properties: GroupIdentifyArgs["properties"],
): Promise<void> {
  await posthog.groupIdentify(ctx, {
    groupType: "barbershop",
    groupKey: barbershopId,
    properties,
  });
}

export async function trackException(
  ctx: AnalyticsCtx,
  error: CaptureExceptionArgs["error"],
  distinctId?: string,
  additionalProperties?: CaptureExceptionArgs["additionalProperties"],
): Promise<void> {
  await posthog.captureException(ctx, {
    error,
    distinctId,
    additionalProperties,
  });
}
