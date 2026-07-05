# Audit logging architecture (convex-audit-log)

Status: **design only** — the component is installed and registered but nothing
writes to it yet. This doc defines the event model so that logging added for
one domain (inventory history first) extends cleanly to every domain and,
later, to a **platform-admin view across all barbershops** without migration.

Current state on this branch:

- `convex-audit-log@0.2.0` in `package.json`.
- `app.use(auditLog)` in `convex/convex.config.ts`.
- Client instance in `convex/log.ts` (`new AuditLog(components.auditLog, { piiFields: [] })`).
- No producers, no consumers yet.

## 1. Core decision: one stream, tenant in the event

There is exactly **one** audit-log component instance for the whole app. A
barbershop is a *dimension of the event*, not a separate log. This is what
makes the two consumers cheap:

- **Shop owner view** ("historial" panels): filter the stream by the shop tag.
- **Platform-admin view** (future `/admin`): the same stream, unfiltered or
  grouped by shop — no fan-in, no per-shop queries, no backfill.

## 2. Event contract

Every producer goes through a thin façade in `convex/log.ts` — **never** call
`auditLog.log()` directly from domain code. The façade stamps the invariants so
every event is queryable the same way:

```ts
// convex/log.ts (façade shape — to implement when the first producer lands)
type ShopEvent = {
  barbershopId: Id<"barbershops">;
  /** `<domain>.<entity>.<verb>` — see taxonomy below. */
  action: string;
  actorUserId: string;            // WorkOS id; "system" for cron/lifecycle
  resourceType: string;           // Convex table name
  resourceId: string;
  before?: unknown;               // logChange path: automatic diff
  after?: unknown;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
};

export async function logShopEvent(ctx: MutationCtx, event: ShopEvent) {
  await auditLog.logChange(ctx, {
    action: event.action,
    actorId: event.actorUserId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    before: event.before,
    after: event.after,
    generateDiff: event.before !== undefined,
    severity: event.severity ?? "info",
    // Tenancy lives in tags → `search({ tags: ["shop:<id>"] })` is the shop
    // filter, and the admin view simply omits it.
    tags: [`shop:${event.barbershopId}`, event.action.split(".")[0]],
    metadata: event.metadata,
  });
}
```

Invariants the façade enforces:

1. **Tag `shop:<barbershopId>`** on every event — the tenancy key.
2. **Tag `<domain>`** (first segment of the action) — cheap domain filtering.
3. **`action` naming**: `<domain>.<entity>.<verb>` in snake case verbs:
   `inventory.item.created`, `inventory.stock.adjusted`,
   `team.member.role_changed`, `settings.availability.updated`,
   `appointments.appointment.completed`, `reviews.review.flagged`,
   `billing.plan.changed`.
4. **`actorUserId`** is the WorkOS id (`ctx.userId` from `zAuthMutation`);
   lifecycle/cron paths use `"system"`.
5. **Severity policy**: `info` = routine CRUD; `warning` = destructive or
   permission-adjacent (archive, role change, member removal, negative-stock
   override); `critical` = security/authz denials and irreversible deletions.

## 3. Where producers plug in (funnels first)

Log at the **funnels**, not at every mutation — the same discipline the
inventory system already uses:

| Domain | Funnel call site | Events emitted |
|---|---|---|
| Inventory stock | `recordMovement` (`convex/inventory.ts`) — the sole balance writer | `inventory.stock.<type>` (receipt/sale/consumption/adjustment/…) — one call site covers every stock change, incl. the new create-time `initialQuantity` receipt |
| Inventory catalog | `createItem` / `updateItem` / `archiveItem` | `inventory.item.created|updated|archived` (with `logChange` before/after) |
| Team | `syncMemberAuthz` / `revokeMemberAuthz` dual-write sites (`convex/authz.ts`) | `team.member.added|role_changed|removed` — logging beside the authz mirror keeps the mirror rule visible |
| Appointments | `setStatus`, `answerRescheduleRequest`, `cancel` | `appointments.appointment.completed|no_show|cancelled|rescheduled` |
| Settings | each settings mutation (they're already per-section) | `settings.<section>.updated` with diff |
| Reviews | `applyModeration` (internal) | `reviews.review.published|flagged` |

The existing **`inventoryMovements` table stays the operational source of
truth** for balances (the ledger invariant is untouched). The audit log is the
*compliance/history* view on top: actor, before/after, diffs, cross-domain
timeline. `MovementHistory` UI keeps reading the ledger; a future "Actividad"
panel reads the audit stream.

## 4. Consumers

- **Shop-scoped** (owner/staff, near-term): a `zAuthQuery` per surface calling
  `auditLog.search(ctx, { tags: ["shop:<id>"], ... })` gated by
  `assertShopRole(..., ["owner","staff"])` — e.g. item history
  (`queryByResource`), member activity (`queryByActor`), a shop activity feed.
- **Platform-admin** (future): the same `search()` without the shop tag,
  grouped/filtered by `shop:*` tags, severity, or action prefix. Gate behind a
  new `assertPlatformAdmin` (does **not** exist yet — platform admins are not
  shop roles; likely a WorkOS org/role check). `watchCritical()` +
  `detectAnomalies()` become the admin health panel; `getStats()` feeds
  per-shop usage summaries.

## 5. Privacy & retention

- `piiFields` is currently `[]`. Before appointment/customer events land, set
  it to the customer-identifying fields that flow through `before/after`
  snapshots: `["email", "phone", "contactPhone", "customerName", "customerEmail"]`.
- Retention via the component's `cleanup()` on a cron: propose **180 días** for
  `info`, **2 años** for `warning`/`critical` (compliance window), configurable
  per policy later. The inventory ledger keeps its own existing retention
  rollup — unrelated.

## 6. What NOT to do

- No per-barbershop component instances, no per-domain log tables.
- No logging from the client — producers are Convex mutations only.
- No double-writing quantities into the audit log as authoritative data — the
  ledger owns numbers; the audit log owns *who/what/when/diff*.
- Don't bypass the façade: raw `auditLog.log()` calls lose the tenant tag and
  break the admin view's assumptions.

## 7. Rollout order (when implementation is scheduled)

1. Façade (`logShopEvent`) + PII config in `convex/log.ts`.
2. Inventory: `recordMovement` + catalog mutations (one PR, verifiable against
   the existing `MovementHistory`).
3. Team + settings + appointments funnels.
4. Shop activity feed UI (owner/staff).
5. `assertPlatformAdmin` + admin surface (cross-shop search, critical watch,
   anomaly panel).
