# Inventory system — design doc

> Status: **decisions resolved (§16) — awaiting final doc approval; no production
> code exists yet.**
> Sources: Vendure stock-control, Medusa inventory module, and ERPNext stock ledger were mined
> for the model; every pattern below was verified against this repo's actual conventions
> (`convex/services.ts`, `convex/aggregates.ts`, `convex/notifications.ts`, `convex/authz.ts`,
> `src/hooks/use-services.ts`, etc.).

## 0. The model in one paragraph

Three layers plus one invariant. **Item** = definition, no quantity (Medusa's
`InventoryItem`). **Level** = tiny hot doc with running balances `onHand` /
`reserved`, one per (item, location) (Vendure's `StockLevel`, ERPNext's `Bin`).
**Movement** = append-only ledger row with signed effect, cost snapshot, and
`balanceAfter` (ERPNext's Stock Ledger Entry). The invariant — `level.onHand ==
Σ onHand-effects of its movements` (and the same for `reserved`) — is enforced
by a single choke-point helper, `recordMovement`, that appends the ledger row,
patches the level, and updates aggregates **inside one Convex mutation**
(serializable, all-or-nothing; this is what ERPNext needs `SELECT FOR UPDATE`
for and Vendure gets wrong). Nothing else may touch `onHand`/`reserved`.

---

## 1. Schema (`convex/schema.ts`, zodTable style)

```ts
export const inventoryItems = zodTable("inventoryItems", (id) => ({
  barbershopId: id("barbershops"),
  name: z
    .string({ error: "El nombre es requerido" })
    .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
    .max(120, { error: "El nombre debe tener menos de 120 caracteres" })
    .trim(),
  sku: z.string().max(64).trim().optional(),
  category: z.enum([
    "drink", "blade", "machine", "spray", "alcohol",
    "tool", "consumable", "retail", "other",
  ]),
  // DECIDED: quantities are ALWAYS integers in this unit. Liquids/weights use
  // integer base units (ml, g) — a 1L bottle is 1000 ml. No floats, no drift.
  unit: z.enum(["unit", "ml", "g", "box", "pack"]),
  isSellable: z.boolean().default(false),
  // COP integer pesos. Weighted moving average, updated on receipt (§3.3).
  unitCost: z.coerce
    .number({ error: "El costo es requerido" })
    .int({ error: "El costo debe ser un número entero" })
    .min(0, { error: "El costo no puede ser negativo" }),
  salePrice: z.coerce
    .number()
    .int({ error: "El precio debe ser un número entero" })
    .min(1000, { error: "El precio debe ser mayor a $1.000" }) // matches services
    .optional(),
  reorderPoint: z.coerce
    .number()
    .int({ error: "El punto de pedido debe ser un número entero" })
    .min(0, { error: "El punto de pedido no puede ser negativo" })
    .default(0),
  reorderQuantity: z.coerce.number().int().min(1).optional(),
  allowNegativeStock: z.boolean().default(false), // DECIDED: reject by default, per-item override
  imageKey: z.string().optional(),                // R2 key, never a URL/blob
  deletedAt: z.number().optional(),               // archive = soft delete
}));

export const inventoryLevels = zodTable("inventoryLevels", (id) => ({
  barbershopId: id("barbershops"),
  itemId: id("inventoryItems"),
  locationId: z.string().optional(), // undefined = main location (multi-location seam)
  onHand: z.number().int(),
  reserved: z.number().int().default(0),
  // Denormalized from the item so the valuation aggregate's sumValue
  // (onHand * unitCost) lives entirely on this doc (§5).
  unitCost: z.number().int().min(0),
  belowReorder: z.boolean(),          // denormalized: onHand <= item.reorderPoint
  lowStockAlertedAt: z.number().optional(), // alert hysteresis stamp (§6)
}));

export const inventoryMovements = zodTable("inventoryMovements", (id) => ({
  barbershopId: id("barbershops"),
  itemId: id("inventoryItems"),
  itemName: z.string(),               // snapshot — history survives rename/archive
  locationId: z.string().optional(),
  type: z.enum([
    "receipt", "sale", "consumption", "adjustment", "waste", "return",
    "reservation", "release",         // DECIDED: reservations ship in MVP (§3.5)
    "transfer_in", "transfer_out",    // dormant until multi-location
  ]),
  // Positive magnitude for every type EXCEPT adjustment, which stores the
  // signed delta (Vendure convention). Effects derived via §2 matrix.
  quantity: z.number().int(),
  unitCostAtTime: z.number().int(),   // snapshot (ERPNext: row is self-auditing)
  balanceAfter: z.number().int(),     // onHand after applying — O(1) audit/reconcile
  reason: z.string().max(300).optional(),
  actorUserId: z.string(),
  relatedAppointmentId: id("appointments").optional(),
  idempotencyKey: z.string().optional(), // webhooks/imports dedupe (creditPurchases pattern)
}));

// DECIDED: reservations ship in MVP, driven by per-service recipes.
// "Corte clásico consume 1 cuchilla + 20 ml de spray" — booking auto-reserves,
// completion auto-consumes, every cancellation path auto-releases (§3.5).
export const serviceInventoryUsage = zodTable("serviceInventoryUsage", (id) => ({
  barbershopId: id("barbershops"),
  serviceId: id("services"),
  itemId: id("inventoryItems"),
  quantity: z.coerce
    .number({ error: "La cantidad es requerida" })
    .int({ error: "La cantidad debe ser un número entero" })
    .min(1, { error: "La cantidad debe ser mayor a 0" }), // in the item's unit
}));

// Retention rollup target (§10). Month keys are America/Bogota (§9).
export const inventoryMovementSummaries = zodTable(
  "inventoryMovementSummaries",
  (id) => ({
    barbershopId: id("barbershops"),
    itemId: id("inventoryItems"),
    itemName: z.string(),
    month: z.string(), // "YYYY-MM", Bogota-local
    type: z.enum([
      "receipt", "sale", "consumption", "adjustment", "waste", "return",
      "reservation", "release", "transfer_in", "transfer_out",
    ]), // same enum as inventoryMovements.type
    totalQuantity: z.number().int(),
    totalCost: z.number().int(), // Σ quantity * unitCostAtTime
  }),
);
```

Registration in `defineSchema` (index style matches `by_x_and_y` dominant form):

```ts
inventoryItems: inventoryItems
  .table()
  .index("by_barbershopId", ["barbershopId"])
  .index("by_barbershopId_and_category", ["barbershopId", "category"]),
  // Archived-item exclusion follows repo precedent (barbershopMembers.ts:108):
  // by_barbershopId + code-side `deletedAt === undefined` filter — items per
  // shop are few. A compound (barbershopId, deletedAt) index is a later
  // optimization if archived items ever pile up.
inventoryLevels: inventoryLevels
  .table()
  .index("by_barbershopId", ["barbershopId"])
  .index("by_itemId", ["itemId"]) // availability = Σ across locations
  .index("by_barbershopId_and_belowReorder", ["barbershopId", "belowReorder"]),
inventoryMovements: inventoryMovements
  .table()
  .index("by_itemId", ["itemId"])               // + implicit _creationTime for ranges
  .index("by_barbershopId", ["barbershopId"])
  .index("by_idempotencyKey", ["idempotencyKey"])
  .index("by_relatedAppointmentId", ["relatedAppointmentId"]), // outstanding-reservation sums (§3.5)
serviceInventoryUsage: serviceInventoryUsage
  .table()
  .index("by_serviceId", ["serviceId"])          // recipe lookup at booking
  .index("by_itemId", ["itemId"])                // archive-impact check
  .index("by_barbershopId", ["barbershopId"]),
inventoryMovementSummaries: inventoryMovementSummaries
  .table()
  .index("by_barbershopId_and_month", ["barbershopId", "month"])
  .index("by_itemId_and_month", ["itemId", "month"]),
```

Plus `export type InventoryItem = output<typeof inventoryItems.schema>;` etc.,
and uniqueness of (itemId, locationId) on levels enforced by get-before-insert
inside `recordMovement` (Convex has no unique constraints; OCC makes the check
race-free).

## 2. Movement effects matrix (the invariant, precisely)

One pure function — Vendure scatters this across five services; we centralize:

```ts
// movementEffects(type, quantity) -> { onHandDelta, reservedDelta }
```

| type         | quantity stored | onHandΔ | reservedΔ | availability check (unless `allowNegativeStock`) |
|--------------|-----------------|---------|-----------|---------------------------------------------------|
| receipt      | +q              | +q      | 0         | —                                                  |
| sale         | +q              | −q      | 0         | available ≥ q                                      |
| consumption  | +q              | −q      | 0         | available ≥ q                                      |
| waste        | +q              | −q      | 0         | available ≥ q                                      |
| return       | +q              | +q      | 0         | —                                                  |
| adjustment   | signed d        | +d      | 0         | onHand + d ≥ 0                                     |
| reservation  | +q              | 0       | +q        | available ≥ q                                      |
| release      | +q              | 0       | −q        | reserved ≥ q                                       |
| transfer_out | +q              | −q      | 0         | available ≥ q                                      |
| transfer_in  | +q              | +q      | 0         | —                                                  |

`available = onHand − reserved` — computed, never stored (Medusa: cannot drift
by construction). Invariant: `level.onHand == Σ onHandDelta` and
`level.reserved == Σ reservedDelta` over the item/location's movements. An
internal `reconcileItem` query recomputes both from the ledger to detect drift
(ERPNext's repair path — defense in depth; Convex atomicity means it should
never fire).

## 3. The `recordMovement` funnel

A **plain exported helper** `recordMovement(ctx: MutationCtx, args)` in
`convex/inventory.ts` — *not* an internal mutation invoked via
`ctx.runMutation`. Callers are already inside a mutation, so a helper gives the
same single-transaction guarantee without a function-call round trip, and it is
the only code path allowed to write `inventoryLevels`/`inventoryMovements`
(matching how `track()` is a helper, per `convex/analytics.ts`).

Steps, in order, all in one transaction:

1. **Dedupe** — if `idempotencyKey` present, `by_idempotencyKey` lookup; if a
   row exists, return it (no-op). Mirrors `creditPurchases.paymentId`
   (`convex/credits.ts:40`).
2. **Load item** — throw `notFound("producto")`; archived items
   (`deletedAt` set) reject everything except `adjustment` and `return`
   (so trapped stock can be corrected/returned, Vendure's soft-deleted-variant
   lesson).
3. **Load or lazily create the level** for (itemId, locationId) —
   `by_itemId` + match; create with zeros + item's `unitCost` if missing.
4. **Availability check** per the §2 matrix; on failure throw
   `ConvexError(errorMessages.insufficientStock)` — new Spanish message. The
   read-then-check happens inside the serializable mutation, so two barbers
   consuming the last blade cannot both pass (loser OCC-retries, then fails
   cleanly). No sharded counters — wrong tool at this volume.
5. **Valuation** (receipt only, §3.3): weighted moving average.
6. **Write through triggers** — `const db = inventoryTriggers.wrapDB(ctx).db`:
   patch the level (`onHand`, `reserved`, `unitCost`, `belowReorder`,
   `lowStockAlertedAt`), insert the movement row with `itemName`,
   `unitCostAtTime`, `balanceAfter` snapshots. Both writes go through the
   wrapped db or the aggregates silently desync (repo gotcha, `acl.ts:284`).
7. **Low-stock hysteresis** (§6): detect the downward crossing, stamp, and
   `ctx.runMutation(internal.notifications.createLowStock, ...)` (which fans
   out via the scheduler — no external calls in the mutation).
8. Return `{ movementId, level }` for the caller's analytics/response.

### 3.3 Valuation — weighted moving average (open decision 3)

On `receipt`:

```
newCost = round((onHand * oldCost + qtyIn * costIn) / (onHand + qtyIn))
```

- Receipt onto `onHand <= 0` **resets** cost to `costIn` (ERPNext edge — the
  average of a negative balance is meaningless).
- Every movement snapshots `unitCostAtTime`, so historical valuation survives
  cost changes.
- `updateItem` cost edits patch item **and** level (through the wrapped db so
  the valuation aggregate `replace`s), and write a zero-quantity `adjustment`
  movement with `reason: "cambio de costo"` for the audit trail.
- FIFO layers: **out** unless requested — ERPNext's `stock_queue` machinery is
  ~60% of its complexity for accuracy a barbershop doesn't need.

## 3.5 Appointment reservations (DECIDED: in MVP, recipe-driven)

**Recipe** = `serviceInventoryUsage` rows per service (§1). Owner/staff define
them once ("Insumos del servicio"); the appointment lifecycle does the rest.

**The ledger IS the reservation state** (Vendure lesson — no status field, no
reservation docs): outstanding reservation for an (appointment, item) =
`Σ reservation − Σ release` over movements with that `relatedAppointmentId`
(`by_relatedAppointmentId` index; an appointment has ≤ a handful of rows).
Derived-with-`Math.min`-caps means double-release is structurally impossible.

Lifecycle hooks — internal helpers called from the existing transition
functions in `convex/appointments.ts`, same transaction as the status change:

| Appointment event | Hook | Movements emitted |
|---|---|---|
| `create` (web) / `agentBook` (Pana) — **both** entry points | `reserveForAppointment` | per recipe line: `reservation` of `min(qty, available)` |
| `cancel`, `setStatus("no-show")`, `answerRescheduleRequest → "denied"`, `deleteAppointment` | `releaseForAppointment` | per item: `release` of outstanding (skip if 0) |
| `setStatus("cancelled")` — **hard-deletes the row**, so the hook runs *before* `ctx.db.delete` using the in-scope doc | `releaseForAppointment` | same |
| `setStatus("completed")` | `consumeForAppointment` | per recipe line: `release` of outstanding **then** `consumption` (pair keeps the §2 effects matrix pure — Vendure's Sale conflates both; we don't) |

**Iron rule: the lifecycle path never throws.** A customer booking or an
appointment completion must not fail because the shop is short on spray:

- Reserve: `min(qty, available)`, floor 0 — partial reservations are fine
  because release/consume work from outstanding, not the recipe.
- Consume at completion (the completed-but-stock-changed race): consume
  `min(recipeQty, onHand)` when the item is strict (`!allowNegativeStock`),
  full `recipeQty` when negative stock is allowed; any shortfall is recorded in
  the movement `reason` (`"faltante: N"`) so the ledger tells the truth instead
  of silently going negative or blocking the barber.
- Recipe lines pointing at archived items (`deletedAt` set) are skipped.
- Shops whose plan lacks inventory (§7) are skipped entirely — a free-tier
  booking must not create movements.
- Idempotency: re-running a hook is safe by construction — reserve is guarded
  by "no prior reservation rows for this appointment", release/consume operate
  on outstanding (0 → no-op).

Manual `reserveStock` / `releaseStock` mutations exist for owner/staff holds
outside appointments (no `relatedAppointmentId`); released manually the same
way.

## 4. Function surface (`convex/inventory.ts`, signatures only)

All mutations use the **declarative `ratelimit` property** — supported by
`zAuthMutation` today (`convex/index.ts:42`) but with zero existing call sites;
inventory is deliberately its first adopter because the alternative (inline
`rateLimitOrThrow`) double-consumes the shared `authWrite` fixed-window bucket
(10/hour!) and chatty stock ops would exhaust it. Mission requirement upheld:
no in-handler `rateLimitOrThrow` calls.

```ts
// ---- catalog ----
createItem   = zAuthMutation({ args: inventoryItems.tools.insert, ratelimit: "createInventoryItem" })
               // assertCanManageInventory → insert item + level(0) → track("inventory_item_created")
updateItem   = zAuthMutation({ args: inventoryItems.tools.update, ratelimit: "updateInventoryItem" })
               // guard data.barbershopId + cross-tenant check (services.ts pattern)
archiveItem  = zAuthMutation({ args: z.object({ item: inventoryItems.tools.id,
                 barbershop: barbershops.tools.id, force: z.boolean().optional() }),
                 ratelimit: "archiveInventoryItem" })
               // soft delete (deletedAt). If reserved > 0 OR recipes reference the
               // item (by_itemId on serviceInventoryUsage): throw "WILL_RELEASE:N"
               // → 2-step confirm (delete-service-dialog contract); force releases
               // holds and deletes the recipe lines. Hard delete: never.

// ---- stock ops (thin wrappers over recordMovement) ----
receiveStock       = zAuthMutation({ args: { item, quantity, unitCost?, reason?, idempotencyKey? },
                       ratelimit: "receiveStock" })       // manage role
adjustStock        = zAuthMutation({ args: { item, delta? , absoluteCount?, reason },
                       ratelimit: "adjustStock" })        // manage; absoluteCount computes
                                                          // delta = counted − onHand internally
                                                          // (stock-take; ledger stays truthful)
recordConsumption  = zAuthMutation({ args: { item, quantity, reason?, relatedAppointmentId? },
                       ratelimit: "recordConsumption" })  // consume role (incl. barber)
recordSale         = zAuthMutation({ args: { item, quantity },
                       ratelimit: "recordSale" })         // consume role; requires isSellable
                                                          // → track("product_sold", { revenue })
recordWaste        = zAuthMutation({ args: { item, quantity, reason },
                       ratelimit: "adjustStock" })        // manage role
reserveStock       = zAuthMutation({ args: { item, quantity, reason? },
                       ratelimit: "reserveStock" })       // manage role, manual hold
releaseStock       = zAuthMutation({ args: { item, quantity, reason? },
                       ratelimit: "reserveStock" })       // manage role

// ---- service recipes (§3.5) ----
setServiceRecipe   = zAuthMutation({ args: { service, lines: [{ item, quantity }] },
                       ratelimit: "updateInventoryItem" }) // manage; replaces the
                                                           // service's recipe atomically
getServiceRecipe   = zAuthQuery({ args: { service } })     // by_serviceId

// ---- appointment lifecycle (internal helpers, §3.5 — called from appointments.ts) ----
reserveForAppointment / releaseForAppointment / consumeForAppointment
  // plain helpers taking MutationCtx (track()-style), never throw,
  // no-op for plans without inventory and for shops with no recipes

// ---- bulk receiving ----
receiveStockBatch  = zAuthMutation({ args: { barbershop, lines: [...max 50], idempotencyKey? },
                       ratelimit: "receiveStock" })
// A PLAIN mutation, deliberately: N ledger appends + N level patches fit one
// transaction easily at ≤50 lines and stay atomic (all-or-nothing receipt).
// The Workflow component is reserved for a future flow with external calls
// (invoice OCR / supplier API) — its steps are NOT jointly atomic, which is
// strictly worse here. (Verified against @convex-dev/workflow 0.4.4 docs.)

// ---- queries (all indexed; no bare .filter on large tables) ----
getInventoryOverview = zAuthQuery({ args: { barbershop } })
  // items (by_barbershopId, code-side deletedAt === undefined filter — repo
  // precedent) + levels (by_barbershopId), joined in-memory — both per-shop
  // and small; ONE live subscription drives the table
listItems            = zAuthQuery({ args: { barbershop, category?, paginationOpts } })
getItem              = zAuthQuery({ args: { item } })     // item + its level(s)
listLowStock         = zAuthQuery({ args: { barbershop } })
  // by_barbershopId_and_belowReorder eq(true) — the badge + restock list
listMovements        = zAuthQuery({ args: { item, paginationOpts } })
  // by_itemId, order desc, .paginate — ledger history, always paginated
getValuation         = zAuthQuery({ args: { barbershop } })
  // inventoryValueAggregate.sum({ namespace: barbershopId })
getMonthlyConsumption= zAuthQuery({ args: { barbershop, month? } })
  // movements aggregate, bounds = [type, bogotaMonthStartMs]..[type, bogotaMonthEndMs]

// ---- internal ----
reconcileItem        = zInternalQuery  // ledger vs level drift report (§2)
rollupOldMovements   = zInternalMutation // retention cron handler (§10)
```

Authorization (DECIDED — convex-authz, §7): every function opens with

```ts
await assertInventoryAllowed(ctx, barbershopId); // plan gate (owner's sub, §7)
await authz.require(ctx, userId, "inventory:manage" /* or "inventory:consume" */,
  { type: "barbershop", id: barbershopId });
```

New error messages (`convex/errors.ts`, Spanish):
`insufficientStock`, `itemArchived`, `itemNotSellable`, plus
`` `WILL_RELEASE:${n}` `` protocol string for the 2-step archive.

## 5. Aggregates + triggers plan

Two new component instances (each needs `app.use(aggregate, { name })` +
`pnpx convex dev --once`):

| Instance | Type | Table | namespace | sortKey | sumValue | Answers |
|---|---|---|---|---|---|---|
| `aggregateInventoryValue` | TableAggregate | inventoryLevels | barbershopId | itemId (string) | `onHand * unitCost` | total valuation, O(log n), live |
| `aggregateInventoryMovements` | TableAggregate | inventoryMovements | barbershopId | `[type, _creationTime]` | `abs(quantity)` | units consumed/sold/received per arbitrary period via prefix+range bounds |

Wiring mirrors `usageTriggers` exactly (`convex/aggregates.ts:116`):

```ts
export const inventoryTriggers = new Triggers<DataModel>();
inventoryTriggers.register("inventoryLevels", inventoryValueAggregate.trigger());
inventoryTriggers.register("inventoryMovements", inventoryMovementsAggregate.trigger());
```

Key constraints honored:

- `sumValue` is frozen at write time and **never recomputed** — which is why
  `unitCost` is denormalized onto the level doc (§1); every cost change patches
  the level through the wrapped db so the trigger fires `replace`.
- **Every** write site uses `inventoryTriggers.wrapDB(ctx).db`. There are
  exactly two write sites by design: `recordMovement` and the
  `updateItem` cost fan-out. `barbershopCascade.ts` must also delete inventory
  rows through the wrapped db (or the aggregates leak after shop deletion —
  existing gotcha with `reviewRatingsAggregate`).
- Month boundaries are computed **at query time** as Bogotá-local timestamp
  ranges against `[type, _creationTime]` — no stored month key on movements,
  and no dependence on the UTC `getCurrentYearMonth()` (§9).
- Namespacing per barbershop isolates write contention; the near-monotonic
  `_creationTime` suffix serializes inserts only within one shop+type — fine at
  barbershop volume (report: don't key global aggregates on time).

**What deliberately has no aggregate:** low-stock count/list uses the
`by_barbershopId_and_belowReorder` index (the list is needed anyway and is
small); "total units on hand" is skipped as semantically meaningless across
mixed units (ml + unidades).

> **Fork A (recommended, above):** 2 aggregates. **Fork B (leaner):** zero new
> aggregate instances — valuation via per-shop indexed collect over levels
> (≤ a few hundred tiny docs), consumption via lazy-upserted summary rows (the
> `usage` pattern). Saves two components + backfill machinery; costs O(n)
> reads that re-run on every level change and loses arbitrary-period sums.
> Recommended only if you want minimum moving parts for MVP.

## 6. Low-stock alerts (hysteresis)

Detection is **in-mutation, not a cron** — Convex reactivity means the
decrement itself knows about the crossing (ERPNext needs a daily scheduler; we
don't):

1. In `recordMovement` step 7: `belowReorder = onHand <= item.reorderPoint`.
2. **Downward crossing** (`belowReorder` flips to true AND
   `lowStockAlertedAt` is unset AND item not archived) → stamp
   `lowStockAlertedAt = Date.now()` and dispatch **once**.
3. **Recovery** (`onHand > reorderPoint` after a receipt/adjustment) → clear
   `lowStockAlertedAt` and `belowReorder`. Clearing only on strictly-above
   plus alerting only on a fresh crossing prevents every-sweep re-fires; if
   flapping around the exact threshold proves noisy in practice, add a small
   recovery buffer (clear at `reorderPoint + ceil(0.1 * reorderPoint)`) — one
   line, deferred until observed.
4. `updateItem` recomputes both flags when `reorderPoint` changes (a raised
   threshold can itself cause a crossing).

Dispatch = new `low_stock` notification kind through the existing pipeline
(which is **scheduler-based — there is no notifications workpool**; the only
pool is `reviewModerationWorkpool` and it stays untouched). Checklist per the
pipeline recon:

1. `notificationKinds` + payload fields (`itemName`, `remaining`, `unit`,
   `reorderPoint`) in `convex/schema.ts`.
2. `notificationSubjects.ts`: `low_stock: "Inventario bajo"`.
3. `notificationCopy.ts`: case with es-CO copy — e.g. *"«{itemName}» está por
   agotarse: quedan {remaining} {unit}. Punto de pedido: {reorderPoint}."* —
   `href` → new `deepLinks.inventory()` → `/profile/barbershops/inventory`.
4. `notifications.ts`: `createLowStock` zInternalMutation modeled on
   `createPastAppointmentReminder` (`:621`) — resolve recipient via
   `barbershop.ownerId` → profile → prefs check →
   `scheduleEmailWithQuota` / `scheduleSmsWithQuota` (Twilio leg rides the
   existing per-shop monthly quotas) → `recordInApp`. Owner-only in MVP.
5. React Email template + `sendLowStockEmail` zInternalAction in
   `convex/emails.ts` (`"use node"`).
6. `notification-renderer.tsx` case (tsc's exhaustive `never` checks force 2–6).

## 7. Permissions & plan gating (DECIDED)

**Baseline fact:** roles are `owner | barber | staff` — there is **no `admin`
role** in the Convex layer (WorkOS `admin` is a separate namespace used only
for invitation sync). Confirmed matrix:

| Capability | owner | staff | barber |
|---|---|---|---|
| items/costs/recipes CRUD, receive, adjust, waste, reserve, archive | ✅ | ✅ | ❌ |
| recordConsumption / recordSale | ✅ | ✅ | ✅ |
| inventory UI | full | full | quick consumption entry: item list **without costs/valuation** + registrar consumo/venta |

**DECIDED: `@djpanda/convex-authz` from day one** for the inventory domain
(coexisting with the in-house helpers everywhere else). That makes these
prerequisites part of this project, as their own slice **before** any inventory
function ships (or checks deny everyone):

1. **Install + register**: `pnpm add @djpanda/convex-authz` (v2.4.1),
   `app.use(authz)` in `convex.config.ts`; verify the lockfile — the component
   declares `convex-helpers ^0.1.116` and must resolve to the repo's 0.1.120,
   **never 0.1.119** (the release that mangled every `Id<>` type). Per
   AGENTS.md, read the installed source under `node_modules/.pnpm/` before
   coding against it — the API summary here came from docs.
2. **Client module** `convex/authz.ts`:
   `definePermissions({ inventory: { manage: true, consume: true } })`, roles
   `owner/staff → ["manage","consume"]`, `barber → ["consume"]`,
   `tenantId: "panabarbero"`, barbershop as **scope** (permission strings are
   colon-form: `inventory:manage`). Keep it out of client-reachable import
   graphs (auth.config bundle landmine).
3. **Backfill migration** (Migrations component): iterate active
   `barbershopMembers`, `assignRole(ctx, workosUserId, role, { type:
   "barbershop", id: barbershopId })` per role in `member.roles` (requires the
   `userProfileDataId → userId` join).
4. **Dual-writes at every membership lifecycle site** — `barbershopMembers`
   stays the source of truth for member docs; the component mirrors it:
   shop creation (owner), invitation accept / `syncWorkosMembership` webhook,
   `toggleBarberRole`, member removal/deactivation, `barbershopCascade`
   (offboard). `isActive` has no component analog → **revoke all scoped roles
   on deactivate, re-assign on reactivate**.
5. **One-time ops step**: `npx convex run` the component's
   `ensureCleanupCronRegistered` (expiring grants / audit pruning).

Checks in inventory functions:
`await authz.require(ctx, userId, "inventory:manage" | "inventory:consume",
{ type: "barbershop", id: barbershopId })` — returns void; where the member doc
is needed, fetch it separately (`getBarbershopMemberByUserId`).

Accepted risk (stated, not hidden): the component is ~6 months old,
single-maintainer, one breaking rename (v1→v2) already behind it. Blast radius
is contained to inventory; the dual-writes are additive mirrors; rollback =
swap `authz.require` for two `assertShopRole` wrappers (the in-house fallback
stays a ~20-line diff).

**Plan gating — DECIDED: Pro + Premium**, resolved against the **owner's**
effective billing entitlement (staff/barbers hold no plan):

- `PLAN_LIMITS.inventoryEnabled`: free `false`, pro `true`, premium `true`
  (`convex/plans.ts` — pure TS, flows to the client via `usePlan` free).
- `assertInventoryAllowed(ctx, barbershopId)` in `convex/acl.ts`
  (`assertCanCreateStaffAppointment` shape), called in every inventory/recipe
  mutation and query.
- The appointment lifecycle hooks (§3.5) **silently no-op** for shops without
  the feature — a free-tier booking never creates movements.
- Downgrade semantics: data is retained but locked (mutations/queries gated);
  the route shows the upsell state. Re-upgrade picks up where it left off.

## 8. Rate limits (`convex/ratelimit.ts`)

Registry names mirror function names in camelCase (repo convention — the
mission's kebab-case names would break the `RateLimitName` keyof derivation
style). Sized like their neighbors:

```ts
createInventoryItem:  { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
updateInventoryItem:  { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
receiveStock:         { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
adjustStock:          { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
recordConsumption:    { kind: "token bucket", rate: 30, period: MINUTE, capacity: 15 }, // most frequent
recordSale:           { kind: "token bucket", rate: 30, period: MINUTE, capacity: 15 },
reserveStock:         { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 }, // manual holds + releases
archiveInventoryItem: { kind: "fixed window", rate: 5,  period: 10 * MINUTE },          // destructive
```

Attached via the declarative `ratelimit:` property (§4) — keyed by `userId` at
the wrapper, no in-handler calls, no double consumption of `authWrite`.

## 9. Time buckets & timezone

- Movement timestamps: `_creationTime` (server). Backdating is **not
  supported** — this deletes ERPNext's entire repost machinery by design.
- "Consumed this month": computed at query time as a Bogotá-local
  (`COLOMBIA_OFFSET_MS`, `convex/utils.ts` — fixed UTC−5, no DST) month range
  over the movements aggregate. **Not** `getCurrentYearMonth()` (UTC — month
  flips at 19:00 Bogotá; that quirk stays quarantined in the usage/quota
  domain).
- `inventoryMovementSummaries.month` keys are Bogotá-local.

## 10. Ledger retention

Volume estimate first: a busy shop ≈ 30 movements/day ≈ 11k rows/year of tiny
docs — pruning is about hygiene, not survival. Plan:

- `crons.interval("Rollup old inventory movements", { hours: 24 * 7 },
  internal.inventory.rollupOldMovements)` — mirrors the soft-delete-cleanup
  cron's shape.
- Movements older than **12 months** are folded into
  `inventoryMovementSummaries` (per item × Bogotá-month × type: totalQuantity,
  totalCost) and the raw rows deleted **through the wrapped db**, so the
  movements aggregate stays consistent with live rows by construction.
- Consequence made explicit: the aggregate answers periods inside the retention
  horizon; older periods read summaries. `balanceAfter` on the oldest surviving
  row anchors reconciliation after pruning.
- Lowest-priority slice; shippable after everything else.

## 11. Migration / backfill plan

**Correction to the mission brief:** all five tables are new, so existing shops
need **no inventory-data backfill** — a shop with no items is simply empty, and
both aggregates start empty and consistent. The Migrations component
(`convex/migrations.ts`, already wired) is needed for:

- **The authz backfill (definite, slice 0)**: populate the component's
  `roleAssignments` from active `barbershopMembers` (one `migrations.define`
  over that table, per-role `assignRole` with barbershop scope; idempotent —
  re-assigning an existing role is safe).
- Any future repair: re-sync an aggregate via `clear()` + idempotent-variant
  backfill (documented flow in @convex-dev/aggregate 0.2.2).

Rollout order: schema push → `app.use` aggregate instances → `pnpx convex dev
--once` → deploy functions → UI. Per environment: dev → Railway preview (demo)
→ production, deployed via `railway up` (never git auto-deploy).

## 12. UI surface

Route: `src/routes/_authedRoutes/profile/barbershops/inventory/index.tsx` —
`ssr: "data-only"`, `pendingComponent`, `staleTime/gcTime` from `cacheTime`;
loader resolves the shop from `context.userId` (barbershop is **never** in the
URL), gates owner/staff via `barbershopMemberRolesQueryOptions` redirect,
`await ensureQueryData(inventoryOverviewQueryOptions)` for the spine, `void
prefetchQuery` for leaves. Live stock numbers come free from the subscription —
no polling, reconnects after network blips.

- **Hook module** `src/hooks/use-inventory.ts`: `inventoryOverviewQueryOptions`
  / `lowStockQueryOptions` / `movementsQueryOptions(itemId, cursor)` factories +
  `useInventory()` (suspense) + `useInventoryActions()` bundling the mutations
  (`use-services.ts` shape).
- **Components** under `src/components/inventory/`:
  - `table/columns.tsx` — DataTable columns factory: image thumb, name+SKU,
    category chip, `onHand` with unit, valuation cell (`formatCurrency` COP),
    stock-state `<Badge>` via a `getStockDataByStatus` util
    (ok → `success`, low → `warning`, out/negative → `destructive`), actions
    dropdown. DataTable is lazy-imported with the generics-preserving cast.
  - `item-form.tsx` — `useAppForm`, `validators.onSubmit:
    inventoryItems.insertSchema/updateSchema` (with the required
    `@ts-expect-error` for convex ids), haptic + Spanish `toast` +
    `getConvexErrorMessage` triad; photo via `useUpload` extended with a new
    `"inventory-item"` type (+ the `/upload` HTTP-action switch case, key
    prefix `assets/inventory/${crypto.randomUUID()}`; display through the
    public `VITE_STORAGE_URL` CDN URL — repo convention, not signed URLs).
  - `item-dialog.tsx`, `stock-adjust-dialog.tsx` (ResponsiveModal; operation
    select — recibir/consumir/vender/ajustar/merma — quantity, reason;
    "fijar conteo físico" mode that shows the computed delta before submit),
    `archive-item-dialog.tsx` (2-step `WILL_RELEASE:N` contract),
    `movement-history.tsx` (paginated ledger, type→Badge mapping, es-CO dates).
  - `service-recipe-form.tsx` — "Insumos del servicio": recipe lines
    (item select + quantity in the item's unit) surfaced from the existing
    service dialog/page; owner/staff only; calls `setServiceRecipe`.
  - Summary cards row: valuation (aggregate), low-stock count, sellable count.
- **Barber view** (decided): barbers reach the route and get the reduced
  variant — item list without cost/valuation columns or summary cards, with
  registrar consumo/venta quick actions. Role branching in the loader (no
  redirect for barbers) + column factory flag (`getInventoryTableColumns({
  canManage })`), same double-gating discipline as appointments.
- **Free-tier upsell state**: the route renders the locked/upgrade view from
  `useBarbershopPlan` before touching inventory queries (which are also
  server-gated).
- **Nav**: "Inventario" (Phosphor `PackageIcon`) added to
  `authenticatedRoutes.owner` and `.staff` in `src/config/index.ts`. Nav badges
  don't exist today; the low-stock count badge lives on the page header +
  summary card in MVP (extending `bottom-nav.tsx` render loops is a separate,
  optional diff — flagged, not bundled).
- All copy inline Spanish (es-CO); quantities formatted with the item's unit;
  money via `formatCurrency`.

## 13. Convex cost & reliability note

- **Hot doc is tiny**: a level is 8 scalar fields; the per-shop overview reads
  ≤ a few hundred such docs via one index. Item photos are R2 keys; long text
  capped at 300 chars on `reason`.
- **No unbounded reads**: ledger history is always `.paginate`d; totals come
  from aggregates (O(log n)) or the summaries table — never `.collect()` over
  movements. Every access path in §1 has an index; no bare `.filter` on
  anything that grows.
- **Correctness is transactional, not defensive**: one mutation = ledger row +
  level patch + aggregate update, all-or-nothing; OCC retries make concurrent
  decrements safe without locks (contrast: Vendure's lost-update race,
  Medusa's locking module, ERPNext's FOR UPDATE — all unnecessary here).
- **External effects only via scheduler**: alert emails/SMS are scheduled
  actions on the existing quota-gated pipeline; mutations stay pure.
- **Reactivity is the refresh mechanism**: the stock table, badges, and
  valuation cards are live subscriptions; zero polling code.
- **Write amplification, eyes open**: each stock op writes level + movement +
  2 aggregate B-trees. At barbershop volume (tens/day/shop) this is noise.

## 14. Edge-case ledger (mission ∪ references)

| # | Case | Disposition |
|---|---|---|
| 1 | Negative stock | Reject by default in-transaction (`insufficientStock`); per-item `allowNegativeStock` opt-in (ERPNext granularity). Decision 1. |
| 2 | Concurrent decrements | Serializable mutations + in-transaction availability check; OCC auto-retry. No sharded counter. |
| 3 | Stock-take reconciliation | `adjustStock` with `absoluteCount` computes the signed delta internally; ledger stays append-only; `reason` required. |
| 4 | Archive with stock/history | Soft delete only (`deletedAt`); ledger + `itemName` snapshots keep history readable; `WILL_RELEASE:N` 2-step if reservations exist; hard delete never exposed. |
| 5 | Fractional units | Integers only; liquids/weights in base units (ml/g); `l` dropped from the unit enum. Decision 4. |
| 6 | Valuation with changing cost | WMA on receipt + `unitCostAtTime` snapshots + reset-on-nonpositive-balance; cost edits fan out to level + zero-qty audit movement. Decision 3. |
| 7 | Alert hysteresis | Crossing-edge detection + `lowStockAlertedAt` stamp/clear in the same mutation; optional recovery buffer deferred until observed (§6). |
| 8 | Idempotent external movements | Optional `idempotencyKey` + index + first-write-wins (creditPurchases pattern). Client retries already safe (Convex mutations). |
| 9 | Reservations ↔ appointments | **In MVP** (§3.5): recipe-driven, ledger-derived outstanding with `Math.min` caps, hooks on **all** exit paths incl. the landmines — `setStatus("cancelled")` **hard-deletes** the row (release runs before `ctx.db.delete`), `agentBook` is a second booking entry point, `denied` is terminal, `deleteAppointment` is a third exit. Completed-but-stock-changed race: consume `min(recipeQty, onHand)` with shortfall recorded in `reason`; lifecycle path never throws. |
| 10 | Timezone buckets | Bogotá-local ranges at query time; UTC `getCurrentYearMonth` quarantined (§9). |
| 11 | Ledger growth | 12-month rollup cron → summaries, wrapped-db deletes keep aggregates true (§10). |
| 12 | Multi-location seam | `locationId` everywhere, availability = Σ levels `by_itemId`; transfers = paired movements in one mutation; UI single-location. |
| 13 | Permissions | §7 matrix decided; convex-authz scoped checks on every function; route/nav gating is UX-only on top. |
| 14 | Sellable vs internal | `recordSale` requires `isSellable` (`itemNotSellable`); consumption may carry `relatedAppointmentId` for future cost-per-service analytics. |
| 15 | Bulk receiving | Plain atomic mutation ≤50 lines; Workflow reserved for future external-call flows (explicitly not needed for the ledger+level write). |
| 16 | Missing level row | Lazily created at first movement (Vendure), not an error (Medusa's NOT_FOUND rejected — worse UX for a one-location shop). |
| 17 | No-op adjustment | `absoluteCount == onHand` → skip write entirely (Vendure), naturally idempotent. |
| 18 | Shop deletion cascade | `barbershopCascade.ts` deletes inventory rows through the wrapped db (aggregate hygiene) + R2 image cleanup. |
| 19 | Zod 4 absent-key landmine | Optional fields managed outside forms marked `.optional()` in shared schemas (booking-phone postmortem). |
| 20 | Aggregate desync | Only two write sites, both wrapped; `reconcileItem` + documented `clear()`+backfill repair path. |
| 21 | Booking must never fail on stock | Lifecycle hooks are no-throw by design: partial reserve (`min(qty, available)`), clamped consume with `reason` shortfall, skip archived-item recipe lines (§3.5). |
| 22 | Free-tier shops + lifecycle hooks | Hooks check `inventoryEnabled` first and no-op — no movements for ungated shops (§7). |
| 23 | Service deleted with a recipe | `services.ts` delete cascade also removes the service's `serviceInventoryUsage` rows (`by_serviceId`), alongside its existing appointment/assignment cascade. |
| 24 | Membership drift vs authz component | `barbershopMembers` remains source of truth; dual-writes at every lifecycle site + backfill migration; deactivate = revoke scoped roles (§7). |

## 15. Mission-brief corrections (found during recon)

1. The declarative `ratelimit:` property **works but is unused** today —
   inventory becomes its first adopter (this also avoids the double-limit that
   the current inline convention pays).
2. The notification pipeline is **scheduler-based**; "workpool-backed" was
   stale memory. No new workpool is needed or wanted.
3. **No `admin` role exists** — the role matrix is owner/staff/barber.
4. **No backfill is required** for existing shops — all tables are new.
5. convex-authz permission strings are colon-form (`inventory:manage`), and
   adopting it requires membership dual-writes *first* (§7).
6. Bulk receiving does **not** need the Workflow component in MVP — a plain
   mutation is atomic; workflow steps are not.
7. The mission's item carried both `isActive` and `deletedAt`; the design keeps
   **only `deletedAt`** — one archive flag has no drift states, and the repo's
   own schema comment (reviews) prefers timestamps over booleans.

## 16. Decisions (RESOLVED 2026-07-02)

1. **Negative stock**: reject by default, per-item `allowNegativeStock`
   override.
2. **Reservations in MVP**: **yes** — full appointment wiring (§3.5).
3. **Reservation linkage**: per-service recipe (`serviceInventoryUsage`).
4. **Valuation**: weighted moving average with `unitCostAtTime` snapshots.
5. **Fractional units**: integer base units; `l` dropped from the enum.
6. **Plan gating**: **Pro + Premium** against the owner's subscription
   (`PLAN_LIMITS.inventoryEnabled`).
7. **Barber UI**: quick consumption entry — reduced view, no costs/valuation.
8. **Authz**: **convex-authz from day one** for the inventory domain
   (prerequisite slice in §7; in-house helpers untouched elsewhere).

## 17. Execution plan (after approval)

Backend slices, one commit each (`feat(inventory): …` / `feat(authz): …`),
each passing `pnpx tsc --noEmit` / `pnpx biome check` / `pnpm build`:

- **(0) authz foundation** (`feat(authz)`): install + register convex-authz,
  `authz.ts`, membership dual-writes, backfill migration, cleanup-cron
  registration — verified with a throwaway `authz.can` check before anything
  depends on it (§7).
- (a) schema + indexes + error messages (4 inventory tables + recipe table) →
- (b) aggregate instances + triggers + convex.config →
- (c) `recordMovement` + stock/catalog/recipe mutations (authz + plan gate +
  declarative rate limits from day one — they're part of each function
  definition, not a separate pass) →
- (d) cost-aware queries →
- (e) appointment lifecycle hooks in `appointments.ts` (both booking entry
  points, all four exit paths, completion) + analytics events
  (`inventory_item_created`, `stock_received`, `stock_adjusted`,
  `stock_consumed`, `product_sold`, `stock_reserved`, `inventory_item_archived`
  appended to the closed `AppEventName` union) →
- (f) `low_stock` notification kind end-to-end →
- (g) retention cron.

Frontend slices: `use-inventory` hooks → route + loader + nav (incl. barber
reduced view + free-tier upsell) → components (table, item form, adjust dialog,
recipe form, history, badges) → polish.

Then end-to-end verification with agent-browser against the Definition of Done
flow (create → receive → consume/sell → live update → cross threshold → exactly
one alert → restock → alert state resets → ledger history → aggregate-backed
totals). Note: the saved agent-browser dev login is **not an owner** — an
owner-role test user is required for this flow. Per AGENTS.md, the
`convex-functions` skill gets loaded before slice (a) is written.
