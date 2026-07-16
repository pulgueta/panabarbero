import {
  CascadingDelete,
  defineCascadeRules,
  makeBatchDeleteHandler,
} from "@00akshatsinha00/convex-cascading-delete";
import type { RegisteredMutation } from "convex/server";
import { v } from "convex/values";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  emailUsageAggregate,
  inventoryMovementsAggregate,
  inventoryValueAggregate,
  smsUsageAggregate,
} from "./aggregates";

/**
 * Referential fan-out. `via` is an index on `to` whose FIRST field is `field`.
 *
 * Intentional non-rules:
 * - appointments → reviews: reviews outlive their appointment (author/service
 *   name snapshots) — never cascade them from an appointment.
 * - services → appointments: appointments keep a serviceName snapshot and
 *   survive service deletion (they are soft-cancelled by `deleteService`).
 * - inventoryItems → levels/movements: items are soft-deleted (`archiveItem`);
 *   their ledger rows are only removed by the shop-level rules.
 */
const cascadeRules = defineCascadeRules({
  barbershops: [
    { to: "appointments", via: "by_barbershopId", field: "barbershopId" },
    { to: "barbershopMembers", via: "by_barbershopId", field: "barbershopId" },
    { to: "services", via: "by_barbershopId", field: "barbershopId" },
    {
      to: "barbershopMemberServices",
      via: "by_barbershopId",
      field: "barbershopId",
    },
    { to: "reviews", via: "by_barbershopId", field: "barbershopId" },
    { to: "barbershopMetadata", via: "by_barbershopId", field: "barbershopId" },
    { to: "usage", via: "by_barbershop_month", field: "barbershopId" },
    { to: "extraCredits", via: "by_barbershopId", field: "barbershopId" },
    { to: "creditPurchases", via: "by_barbershopId", field: "barbershopId" },
    {
      to: "mercadopagoCreditCheckouts",
      via: "by_barbershopId",
      field: "barbershopId",
    },
    { to: "inventoryItems", via: "by_barbershopId", field: "barbershopId" },
    { to: "inventoryLevels", via: "by_barbershopId", field: "barbershopId" },
    { to: "inventoryMovements", via: "by_barbershopId", field: "barbershopId" },
    { to: "inventorySales", via: "by_barbershopId", field: "barbershopId" },
    {
      to: "inventorySaleLines",
      via: "by_barbershopId",
      field: "barbershopId",
    },
    {
      to: "serviceInventoryUsage",
      via: "by_barbershopId",
      field: "barbershopId",
    },
    {
      to: "inventoryMovementSummaries",
      via: "by_barbershopId_and_month",
      field: "barbershopId",
    },
  ],
  services: [
    { to: "barbershopMemberServices", via: "by_serviceId", field: "serviceId" },
    { to: "serviceInventoryUsage", via: "by_serviceId", field: "serviceId" },
  ],
  barbershopMembers: [
    {
      to: "barbershopMemberServices",
      via: "by_barbershopMemberId",
      field: "barbershopMemberId",
    },
  ],
});

export const cascadingDelete = new CascadingDelete(
  components.convexCascadingDelete,
  { rules: cascadeRules },
);

/**
 * Above this estimated row count the teardown switches to batched mode so the
 * write side stays clear of the per-mutation document-write limit. Inline mode
 * is fully atomic; batched mode is per-batch atomic and eventually complete.
 */
export const INLINE_CASCADE_LIMIT = 2000;
export const CASCADE_BATCH_SIZE = 2000;

/**
 * Union of `usageTriggers` + `inventoryTriggers` (aggregates.ts) in a SINGLE
 * Triggers instance. Nesting the two wrapDB calls deadlocks: convex-helpers
 * serializes writes through module-global locks, and a registered-table
 * delete in the outer wrapper holds the lock the inner wrapper then waits on.
 */
const cascadeTriggers = new Triggers<DataModel>();

cascadeTriggers.register("usage", smsUsageAggregate.trigger());
cascadeTriggers.register("usage", emailUsageAggregate.trigger());
cascadeTriggers.register("inventoryLevels", inventoryValueAggregate.trigger());
cascadeTriggers.register(
  "inventoryMovements",
  inventoryMovementsAggregate.trigger(),
);

/** Trigger-aware ctx for cascade row deletion; see module doc. */
export const withCascadeTriggers = (ctx: MutationCtx): MutationCtx =>
  cascadeTriggers.wrapDB(ctx);

const triggeredInternalMutation = customMutation(
  internalMutation,
  customCtx((ctx) => ({ db: withCascadeTriggers(ctx).db })),
);

/**
 * Worker the component's scheduler invokes for each batch of a large cascade.
 * Built from the trigger-wrapped builder so batched deletes also keep the
 * usage/inventory aggregates in sync. The factory returns `any`, which codegen
 * drops from the api types — the annotation restores the function reference.
 */
export const batchDeleteHandler: RegisteredMutation<
  "internal",
  { targets: { table: string; id: string }[]; jobId: string },
  Promise<void>
> = makeBatchDeleteHandler(
  triggeredInternalMutation,
  components.convexCascadingDelete,
);

/**
 * Probes every rule's index against the deployment. Run after schema or rule
 * changes: `pnpx convex run cascade:validateRules`.
 */
export const validateRules = internalQuery({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await cascadingDelete.validateRules(ctx);
    return "ok" as const;
  },
});
