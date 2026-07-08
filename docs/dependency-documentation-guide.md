# Dependency documentation guide

Status: **agent reference**. Use this guide when a task touches one of the resources below and a local skill cannot be loaded or does not cover the specific package. Prefer the local skill first, then use the linked docs as the source of truth before editing code.

## How to use this guide

1. Identify the package or component involved in the task.
2. Load the matching local skill when one exists.
3. If the skill is unavailable, too broad, or stale for the question, open the resource listed here and follow the package docs directly.
4. For Convex code, also follow `ARCHITECTURE.md` section 1.4 and read Convex generated guidelines when present.
5. Keep package-manager commands in project form: use `pnpm add`, not `npm install`, even when upstream docs show npm.

## Resource groups

### TanStack

Use for routing, headless tables, and high-frequency UI behavior.

| Package | Docs | When to use | Repo note |
|---|---|---|---|
| `@tanstack/react-router` | [Router Context](https://tanstack.com/router/latest/docs/guide/router-context.md) | Typed router context, `beforeLoad`, loaders, `router.invalidate()`. | Auth/query-client access belongs in router context. No hooks in loaders. Keep `staticData.breadcrumb` + `useMatches()`. |
| `@tanstack/react-pacer`, `@tanstack/pacer`, `@tanstack/pacer-lite` | [Pacer llms.txt](https://tanstack.com/pacer/latest/llms.txt) | Debounce, throttle, rate limit, queue, batch. | Use React APIs for search, autosave, filtering, and action queues. |
| `@tanstack/react-table`, `@tanstack/table-core` | [Table llms.txt](https://tanstack.com/table/latest/llms.txt) | Columns, row models, sorting, filtering, pagination, selection, faceting, sizing, pinning, virtualization. | Headless only; keep markup/styles in PanaBarbero UI. |

### Convex Components

Use for Convex add-ons: aggregates, audit, authorization, workflows, migrations, work queues, and messaging.

| Package/tool | Docs | When to use | Repo note |
|---|---|---|---|
| `@convex-dev/aggregate` | [llms.txt](https://www.convex.dev/components/aggregate/llms.txt), [markdown](https://www.convex.dev/components/aggregate/aggregate.md) | Counts, sums, ranks, ranges, offset pagination, random access, backfills. | Used for appointment, usage, and rating totals. Write `usage` through `usageTriggers.wrapDB(ctx).db`. |
| `convex-audit-log` | [llms.txt](https://www.convex.dev/components/convex-audit-log/llms.txt), [markdown](https://www.convex.dev/components/convex-audit-log/convex-audit-log.md) | Events, diffs, PII redaction, severity, tags, reports, retention, React hooks. | Read `docs/audit-log-architecture.md`; use a local facade for tenant tags and PII policy. |
| `convex-whatsapp` | [component page](https://www.convex.dev/components/convex-whatsapp) | WhatsApp Cloud API messages, webhooks, delivery status, templates, media, conversations, unread counts, Meta signatures. | Future notification channel. Use as reminder fallback reference; count WhatsApp reminders from WhatsApp usage and billing when enabled. |
| `@convex-dev/workflow` | [markdown](https://www.convex.dev/components/workflow/workflow.md), [llms.txt](https://www.convex.dev/components/workflow/llms.txt) | Durable steps, retries, delays, external waits, cancellation, restart, status, `onComplete`, parallel steps. | Deterministic handlers only; HTTP and side effects belong in action steps. |
| `@convex-dev/migrations` | [llms.txt](https://www.convex.dev/components/migrations/llms.txt) | Live migrations, batched updates, resumable progress, dry runs, targeted ranges, backfills. | Keep migrations internal, resumable, and compatible with current zod wrappers. |
| `@convex-dev/workpool` | [llms.txt](https://www.convex.dev/components/workpool/llms.txt) | Priority queues, concurrency, retries, backoff, idempotent async work, job status, callbacks. | Use separate pools so low-priority work cannot block critical notifications. |
| `@djpanda/convex-authz` | [markdown](https://www.convex.dev/components/djpanda/convex-authz/convex-authz.md), [llms.txt](https://www.convex.dev/components/djpanda/convex-authz/llms.txt) | RBAC, ABAC, ReBAC, scoped roles, inheritance, relationship tuples, O(1) checks, expiring grants, tenant isolation, React gates, authz audits. | Current server roles live in `convex/authz.ts`; do not add this without an architecture decision. |
