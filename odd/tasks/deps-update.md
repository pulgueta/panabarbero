# Dependency update

## Objective

Update pnpm and the root dependencies to their latest allowed versions on branch `chore/deps-update` (stacked on `chore/oxc-migration`), and fix the call sites that the new versions break.

## Problem

The dependencies were behind. TanStack Query 5.104 deprecates `ensureQueryData`, `prefetchQuery`, and `fetchQuery`, and other new versions break types (maplibre, TanStack Router, zod, Polar SDK). The owner requires that each migrated query call behaves exactly like the original method.

## Constraints

- pnpm only. Respect the `minimumReleaseAge` gate (1 day).
- Do not take a major version that needs a large rewrite or changes runtime behaviour without its own task.
- Every `queryClient.query(...)` replacement must keep the result, the fetch count, the error behaviour (reject or swallow), and the blocking order of the original method.
- Commits are `type(scope): description`, no body.

## Acceptance criteria

- `packageManager` is pnpm 12; the lockfile installs with `--frozen-lockfile`.
- No `typescript/no-deprecated` findings; `oxlint` 0 findings; `oxfmt --check` exit 0.
- `tsc --noEmit` for `.`, `convex`, `emails`: 0 errors each.
- A deterministic test proves each `query()` form equals the deprecated method it replaced.
- `pnpm test` passes; `pnpm build` exits 0.

## Tasks

- [x] D1 Update pnpm and dependencies, fix the call sites that the new versions break. Route: delegated writer (root `package.json`, lockfile, and the broken call sites). Evidence: see "D1 Dependency update".
- [x] D2 Prove that every migrated query call equals the original method; fix each site that differs. Route: delegated writer (route loaders + new test file). Evidence: see "D2 Query method equivalence".
- [x] D3 Fix the two problems that the browser smoke test found: the blank map (MapLibre worker) and the React `use()` error on the barbershop detail page. Route: delegated writer (`src/components/ui/map.tsx`, `package.json`, lockfile). Evidence: see "D3 Map worker and React use() error".

## Progress

- D1 done (former T8 of `odd/tasks/oxc-migration.md`).
- D2 done: 134 call sites audited, 1 site restored, 64 equivalence tests added.
- D3 done: map worker loads in dev and in the production build; React held at 19.2.9. A hydration mismatch on the detail page stays open (see D3).

## Evidence

## D1 Dependency update

- pnpm 11.22.0 -> 12.15.0 (`packageManager`). The lockfile now has the pnpm 12 `packageManagerDependencies` document. `pnpm/action-setup` v6.1.0 supports pnpm 12 and reads `packageManager`; CI needs no change.
- `pnpm update --latest` (root only), with the `minimumReleaseAge` gate (1 day). No new `minimumReleaseAgeExclude` entries.
- Major bumps taken: `@convex-dev/aggregate` 0.2 -> 0.3, `@shadcn/helpers` 0.2 -> 0.3, `@tanstack/react-hotkeys` 0.10 -> 0.16, `@tanstack/react-pacer` 0.23 -> 0.24, `@tanstack/react-pacer-devtools` 0.8 -> 0.9, `motion` 13 -> 14, `vitest` 4 -> 5, `@workos/authkit-tanstack-react-start` 0.11 -> 0.12. No call-site change was necessary for them.
- Code changes for the new versions:
  - `@tanstack/react-query` 5.104 deprecates `ensureQueryData`, `prefetchQuery`, `fetchQuery` (`typescript/no-deprecated`, 134 sites). Replaced with `query({ ...opts, staleTime: "static" })`, `query(opts).catch(noop)`, and `query(opts)`. D2 proves the equivalence. `ARCHITECTURE.md` describes the new forms (`b69e1538`); `docs/inventory-design.md` lines 611-612 still name the old methods.
  - `maplibre-gl` 6.15 no longer references the global `GeoJSON` types: added `@types/geojson` and `"geojson"` to `tsconfig.json` `types`.
  - TanStack Router types `ErrorComponentProps.error` as `unknown`: the catch boundary reads `message` only from an `Error`.
  - `zod` 4.6 makes `convexToZod(vOnCompleteArgs(...))` hit TS2589: `onModerationComplete` uses `convexToZodFields(...fields)`.
  - `@polar-sh/sdk` (auto-installed peer of `@convex-dev/polar`) resolved to 1.0.2 and broke the Polar types: `overrides` pins it to 0.49.0 (the previous version).
- Held back:
  - `@tanstack/react-table` 8.21.3 (latest 9.3.1): v9 is a full API and reactivity rewrite (11 files, about 110 type errors, React Compiler subscription changes); needs its own task with a browser check.
  - `ai` 6.x (latest 7.0.x) and `@convex-dev/agent` 0.6.4 (0.7 needs ai 7): ai 7 moves OpenTelemetry to `@ai-sdk/otel` (PostHog AI traces stop without it), makes telemetry opt-out, and changes multi-step result and usage semantics; agent 0.7.8 also fails TS2590 on `new Agent` (fixed upstream in get-convex/agent#414, not released).
  - `@convex-dev/rate-limiter` 0.3.2 (latest 0.4.2): 0.4 requires `ctx.meta`, which the agent `usageHandler` ctx type does not have; 0.4 only adds the async mode we do not use.
  - `@convex-dev/workos-authkit` 0.2.8 (latest 0.2.10): 0.2.9 stops reading the WorkOS Events API, so `organization_membership.*` and `user.*` events arrive only if the WorkOS webhook selects them. Check the WorkOS dashboard first, then update and remove `additionalEventTypes`.
  - `@workos-inc/node` 10.14.0 (latest 11.0.0): authkit packages accept only `^10`.
  - OpenTelemetry 2.x line: `@opentelemetry/api` ~1.9.1, `resources` 2.12.0, `sdk-trace-base` 2.12.0, `exporter-trace-otlp-http` 0.223.0 (latest 1.10.0 / 3.0.0 / 0.300.0): v3 replaces `sdk-trace-base` with `sdk-trace`, and `@posthog/ai` peers `sdk-trace-base ^2`.
  - `@types/node` 24.19.2 (latest 26.6.5): runtime is Node 24 (`engines`, CI).
  - Age gate (newest allowed taken): `@ai-sdk/react` 4.0.154, `@posthog/ai` 8.16.1, `@tanstack/react-router` 1.170.46, `@tanstack/react-start` 1.169.4, `@tanstack/router-plugin` 1.168.48, `convex` 1.48.0, `motion` 14.6.0, `oxlint-tsgolint` 7.0.2005, `ai` 6.0.314.
- `convex-whatsapp` stays 1.1.5 (latest); patch unchanged. `convex-helpers` resolves to 0.1.129 (0.1.128 transitively); no 0.1.119.
- Peer warnings left: `@opentelemetry/api` 1.10.0 enters through `@opentelemetry/api-logs` (dependency, not peer) in the exporter and `react-doctor` trees; `ai` 6 vs `@shadcn/helpers` 0.3 and `@convex-dev/rag` (both peer `ai ^7`, same as before).

### D1 verification

- `oxlint`: 0 findings. `oxfmt --check`: exit 0.
- `tsc --noEmit` for `.`, `convex`, `emails`: 0 errors each.
- `pnpm test`: 19 passed. `pnpm build`: exit 0. `pnpm install --frozen-lockfile`: pass.
- Not done: browser check of loaders (query migration), error boundary, map, and Convex deploy of the updated components (`aggregate` 0.3, `workpool`, `workflow`).

### D1 commits

- `39db598c` chore(pnpm): update to 12.15.0
- `8257a0a7` chore(deps): update dependencies to latest
- `11c9628e` fix(types): load geojson types for maplibre 6.15
- `4e7bdee0` fix(router): narrow unknown route errors
- `a6f29a38` fix(reviews): convert workpool callback fields for zod 4.6
- `684d7e8b` refactor(query): replace deprecated query client methods

## D2 Query method equivalence

Source read: `@tanstack/query-core` 5.104.5 `src/queryClient.ts` and `src/query.ts`.

- `fetchQuery(o)` and `query(o)` run the same code (retry defaults to `false` only when the client has no default; fetch when `isStaleByTime(staleTime)`). The only difference: `query()` applies `select`.
- `prefetchQuery(o)` is `fetchQuery(o).then(noop).catch(noop)`: it never rejects.
- `ensureQueryData(o)` fetches through `fetchQuery(o)` when there is no cached data, else returns the cached data (plus a background refetch only with `revalidateIfStale`). `query({ ...o, staleTime: "static" })` is equal, except `select` (applied) and `revalidateIfStale` (ignored).
- `staleTime: "static"` does not leak: `Query` reads `staleTime` only from observer options.

Per-site audit of `684d7e8b` (no other commit after `4747066a` touches these calls):

| Old method | Sites | New form | `select` | `revalidateIfStale` | Value used where old differs | Await order | Mismatch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ensureQueryData` | 85 | `await query({ ...o, staleTime: "static" })` | none | none | no | same | 0 |
| `prefetchQuery` | 47 | `void query(o).catch(noop)` | none | none | no (all `void`) | same (unawaited) | 1 (billing) |
| `fetchQuery` | 2 | `query(o)` | none | none | no | same | 0 |

- Every option factory is `convexQuery(...)` (`staleTime: Infinity`, no `select`), `getWorkosAuthQueryOptions()`, or `saleProofUrlQueryOptions()`. The only `select` in `src/hooks` is inside the `useInventoryItemAudit` hook, not in `inventoryItemAuditQueryOptions()`, which the history loader uses. The client defaults in `src/router.tsx` (`retry: 5`, `staleTime: cacheTime.low`) apply the same way to both forms.
- Mismatch fixed: the billing loader (`src/routes/_authedRoutes/profile/barbershops/settings/billing/index.tsx`) had changed two `void prefetchQuery(...)` calls into one `void Promise.allSettled([query(a), query(b)])` to satisfy `promise/no-nesting`. Restored to two `void queryClient.query(...).catch(noop)` statements, each with a scoped `oxlint-disable-next-line promise/no-nesting` comment.
- Test `tests/query-client-migration.test.ts`: runs each deprecated method and its replacement on two identically seeded clients (client defaults like `src/router.tsx`: finite `staleTime`, `retry: 2`), and compares the outcome (value or rejection), the `queryFn` call count, and the cache state. Matrix: 3 patterns x 5 option kinds (convexQuery, workosAuth infinite `staleTime`/`gcTime`, `staleTime: 0`/`gcTime: 0`, finite `staleTime`, client defaults) x 4 cache states (empty, fresh, stale by time, invalidated) x success and `queryFn` error. Plus sanity cases and one case that documents the `select` divergence. 64 tests pass. Mutation check: dropping `staleTime: "static"` fails 10 tests; dropping `.catch(noop)` fails 15 tests.

### D2 verification

- `oxlint`: 0 findings. `oxfmt --check`: exit 0 (466 files).
- `tsc --noEmit` for `.`, `convex`, `emails`: 0 errors each.
- `pnpm test`: 2 files, 83 passed. `pnpm build`: exit 0.

### D2 commits

- `30aa9a76` fix(billing): keep per-query catch for streamed credit prefetches
- `7d8f9a6f` test(query): prove queryClient.query matches deprecated methods

## D3 Map worker and React use() error

### Map does not render

- Cause: MapLibre v6 finds its worker with `new URL("./maplibre-gl-worker.mjs", import.meta.url)`. Vite pre-bundles `maplibre-gl` into `node_modules/.vite/deps/`, but it does not copy the separate worker file there, so the worker request fails.
- Not a regression of 6.15: 6.4.0 (`npm pack`, read only) has the same lookup. In 6.4 the request (no `?v=`) gets 404 (Vite "file does not exist ... in the optimize deps directory"); 6.15 adds `?v=<version>`, which Vite treats as an outdated optimized dep, so it gets 504. The base commit `4747066a` (6.4.0) also shows a blank map in dev.
- Fix (`src/components/ui/map.tsx`): the documented Vite setup from the MapLibre install guide, `import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"` and `setWorkerUrl(workerUrl)` at module level. The MapLibre v5-to-v6 guide says that bundlers must call `setWorkerUrl()`. `?worker&url` makes a self-contained worker (plain `?url` would leave out the shared chunk in a build). `optimizeDeps.exclude` was not used: it fixes dev only and is not the documented setup. `setWorkerUrl` only sets a config value, so SSR is not changed (`ssr.noExternal` stays).
- Result: dev loads `maplibre-gl-worker.mjs?worker_file&type=module`; the build emits `.output/public/assets/maplibre-gl-worker-<hash>.js` (self-contained IIFE), and the client map chunk references it. Map tiles and marker show in dev and in the production server.

### React use() error

- Cause: React 19.3 adds a development-only check that logs "This library called use() to suspend in a previous render but did not call use() when it finished" (it is not in `react-dom` 19.2.x). TanStack calls `use()` only while a promise is pending: `HydrationBoundary` in `@tanstack/react-start-client` (`hydration/visible.js`) and `Lazy` in `@tanstack/react-router` (`lazyRouteComponent.js`). React logs the first one only, so the stack shows either of them.
- No version mismatch: the lockfile has one `@tanstack/react-start-client` (1.168.43), which is the dependency of `@tanstack/react-start` 1.169.3.
- No upstream fix: `react-start-client` 1.168.44 and `react-router` 1.170.46 (newest, published 2026-10-22, still inside the 1-day age gate) have the same code. TanStack/router#8487 (`Lazy`) is open; there is no issue for `HydrationBoundary`.
- Fix: hold `react`/`react-dom` at 19.2.9 (newest 19.2.x patch; base had 19.2.8), `@types/react` 19.2.18, `@types/react-dom` 19.2.7. No dependency needs React 19.3. The `<Hydrate>` blocks stay. Update React to 19.3 again when TanStack calls `use()` on each render after it suspends.

### Open: hydration mismatch on the detail page (not fixed)

- Every full load of `/barbershops/<uuid>` logs "Hydration failed" for `BarbershopInfoCard` inside `<Hydrate when={visible()}>`: the server HTML has no map block (metadata not loaded at SSR time), but the client has the metadata when it hydrates. React recovers by client rendering that boundary. The production build logs React error #418.
- It is a regression of this branch: the base commit `4747066a` shows no hydration error. It also occurs with React 19.3.1 and with React 19.2.9, and it does not come from the D1 query migration (with `prefetchQuery` restored for the metadata call, the mismatch stays). The probable cause is the TanStack Start / Router / router-ssr-query update (streamed query data reaches the client before the boundary hydrates). Needs its own task.

### D3 verification

- Browser (agent-browser, logged out, Barbería El Pana): dev with React 19.3.1 showed the `use()` error; dev with 19.2.9 shows no `use()` error and no worker error; map tiles and marker show. Production server (`node .output/server/index.mjs`): worker asset loads, map shows. Screenshots: `/tmp/deps-fix/`.
- `oxlint`: exit 0. `oxfmt --check`: exit 0 (466 files).
- `tsc --noEmit` for `.`, `convex`, `emails`: 0 errors each.
- `pnpm test`: 2 files, 83 passed. `pnpm build`: exit 0. `pnpm install --frozen-lockfile`: pass.

### D3 commits

- `d8de717a` fix(map): load the maplibre worker through vite
- `03d78b7f` fix(deps): hold react at 19.2.9 for tanstack conditional use()

## Next step

- Find and fix the hydration mismatch of `BarbershopInfoCard` (see D3), as a new task.
- Browser check of the other migrated loaders (billing, profile) and the error boundary.
