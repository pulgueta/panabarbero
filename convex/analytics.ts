import type { ActionCtx, MutationCtx } from "./_generated/server";
import { posthog } from "./posthog";

/** Contexts that can schedule — PostHog capture is fire-and-forget via the scheduler. */
type AnalyticsCtx = MutationCtx | ActionCtx;

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
  | "ai_action_confirmed";

/** Capture a product event. No-op when there is no distinct id to attribute it to. */
export async function track(
  ctx: AnalyticsCtx,
  args: {
    distinctId: string | null | undefined;
    event: AppEventName;
    properties?: Record<string, unknown>;
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
  properties?: Record<string, unknown>,
): Promise<void> {
  await posthog.identify(ctx, { distinctId, properties });
}

/** Register or update barbershop group properties in PostHog. */
export async function groupIdentifyBarbershop(
  ctx: AnalyticsCtx,
  barbershopId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  await posthog.groupIdentify(ctx, {
    groupType: "barbershop",
    groupKey: barbershopId,
    properties,
  });
}

export async function trackException(
  ctx: AnalyticsCtx,
  error: unknown,
  distinctId?: string,
  additionalProperties?: Record<string, unknown>,
): Promise<void> {
  await posthog.captureException(ctx, {
    error,
    distinctId,
    additionalProperties,
  });
}
