# ODD feature: mobile-app-monorepo

Locator: `odd/tasks/mobile-app-monorepo.md`. Plan: `.plan/mobile-app-monorepo.md`.
Engram topic: `odd/mobile-app-monorepo/tasks`. Delivery strategy: `auto-chain`, chain strategy
`stacked-to-main` via `gh stack`. RDD: off (global).

## Objective

Ship a barbershop-only Expo mobile app on the existing Convex backend inside a Turborepo
workspace, as a stack of reviewable PRs.

## Problem / why

Barbers need a native app. The repo is a single package, so Expo cannot share the Convex types
today. Push notifications were removed with the old mobile app and must return.

## Scope and constraints

- Web app keeps every feature. Only barbershop experience goes mobile.
- Convex: z* / zAuth* wrappers only. Respect the 32k scan / 1000 schedule limits.
- UI copy: Spanish (es-CO), sentence case. Design tokens from `src/styles.css`.
- Each PR ≤ ~400 authored changed lines where cohesive; renames and lockfile excluded.

## Tasks

| ID | Task | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T1 | Turborepo workspace: move web, backend, emails; root config; CI cwd | delegated (Codex, mechanical, 2+ files) | done (PR #107) | commit de9b92bc. pnpm install OK; backend tsc OK; web tsc OK; web vite build OK; biome ci 0 errors (3 pre-existing warnings); turbo sees @panabarbero/backend + @panabarbero/web. Codex sandbox had no network/git index, parent finished install, staging, shadcn devDep restore, biome globs, alias cleanup. |
| T2 | Expo SDK 58 shell with HeroUI Native, theme tokens, Convex client | delegated (Claude writer, UI) | done | PR #109 c93f8ce7: tsc OK, expo export OK, expo run:ios on iPhone 18 Pro OK (light+dark screenshots reviewed), biome OK. @types/react pinned 19.2.17; HeroUI button/surface class overrides for radii. |
| T3 | WorkOS PKCE auth + ConvexProviderWithAuth | delegated (Claude writer) | done (PR #111) | WorkOS PKCE public client; tsc/biome/export/run:ios OK; authorize URL verified via WorkOS 302 redirect-uri-invalid; full sign-in pending redirect URI registration (user action). |
| T4 | Access gate query + gate screen | delegated | done (PR #112) | getAccess query + AccessGate screen (two compliant copy variants); tsc/biome/export OK; both variants screenshot-verified via temporary preview route; live path pending sign-in. |
| T5 | Push backend: component, pushTokens, pref migration, recordInApp hook | delegated (Codex) | implemented (PR #108) | branch feat/push-notifications-backend @ 0644e682 (opus convex-expert in worktree): backend tsc OK, web tsc OK, biome OK; codegen + convex dev --once + migration run PENDING (worktree had no deployment env). Component 0.4.2 peers convex ^1.46 vs repo 1.42.2 (types OK; runtime check pending). |
| T6 | Mobile push registration + deep links | delegated | done (PR #113) | push.ts/getPushToken/kind table, registration per user, sign-out unregister via removeToken (07017c3e); tsc/biome/export/run:ios OK; live token + banner pending sign-in/EAS id. |
| T7 | Agenda + appointment actions | delegated (Claude writer, UI) | done (PRs #114, #115) | read-only agenda (fcbdb316 incl. focus/deleted fixes) + actions layer (a97a6655); preview screenshots verified; live mutations pending sign-in. |
| T8 | Notifications inbox | delegated | done (PR #116) | inbox tab + badge + watermark read state; reschedule kinds route to the appointment (9a83f4f0); tsc/biome/export OK; simulator pass pending. |
| T9 | Profile + settings | delegated | done (PR #117) | profile tab: account fields, channel switches (optimistic), barber schedule, appearance (SecureStore + Uniwind), sign-out (5a6f57b2); tsc/biome/export OK; simulator pass pending. |
| T10 | Native redirect URI for WorkOS PKCE | inline (one file) | done (PR #111, 74a75647) | `makeRedirectUri` yields `exp://<lan-ip>/--/…` under Metro; fixed constant `panabarbero://auth/callback`. User must register it in the WorkOS environment that serves `localhost:3000/callback` (the one the client id belongs to). |
| T11 | Backend authz gaps (reschedule, active membership, member listing) | delegated (convex-expert, 2+ files) | done (PR #118) | 46cc695e + bceddeb4: reuse `assertCanMutateAppointment`, answer rejects requester; `getByUserIdFn` picks active row; public `getByBarbershopId` projection + gated `getTeamByBarbershopId`. tsc 3/3, biome 0 errors. |
| T12 | Notification dispatcher ported from #103 without WhatsApp | delegated (convex-expert) | done (PR #119) | a49ebe9a…ef02b288: `sendNotification` on email/sms/push prefs, kinds `customer_on_my_way` + `appointment_reassigned`, `markOnMyWay`, web render + mobile routes. tsc/biome/web build/expo export OK. `convex dev --once` blocked by #103-shaped dev data (all profiles `whatsapp` prefs). |
| T13 | Workspace dependency update (convex 1.48, web/backend latest, Expo doctor fixes) | delegated (writer, worktree) | done (PR #120) | be7ffbe3…d3526aee: catalog convex 1.48/zod 4.6/react 19.2.9, ai 7 + agent 0.7, maplibre 6, rate-limiter 0.4; held back react 19.3 (TanStack HydrationBoundary conditional use()), react-table 9, workos-node 12, otel 3, biome 2.6, workos-authkit 0.2.9+. install/typecheck/web build/biome/expo export OK. |

## Acceptance criteria

- `pnpm install` and `turbo run build typecheck lint` pass at the root.
- Web build output and routes unchanged.
- Mobile app signs in, gates non-barbershop users, shows the owner's day agenda.
- A notification created on the backend reaches a registered Expo token.

## Forecast

Authored changed lines ≈ 3500 across 9 PRs. Running count ≈ 4000 authored lines across PRs #107–#117 (several layers carry a size:exception noted in their bodies).

## Progress log

- 2026-10-26: exploration done (4 handoffs). Plan written. Stack root created.
- 2026-10-26: T1 started: converting the root package into a pnpm/Turborepo workspace. Explicit instruction forbids work-unit commits; progress remains uncommitted.
- 2026-10-26: T1 structural conversion completed: web moved to `apps/web`; Convex and email sources moved to `packages/backend`; workspace manifests, Turbo, CI cwd, aliases, and ignores updated. `git mv` could not write `.git/index.lock` in this sandbox, so the required renames are unstaged filesystem moves. `pnpm install` cannot finish because pnpm 11 defaults `verifyDepsBeforeRun` to `install`; its supply-chain metadata check reaches the registry and returns `ENOTFOUND`, leaving `node_modules` incomplete. The existing lockfile still has only the root importer, so it cannot restore the workspace without a successful lockfile-generating install; package checks, build, Biome, Turbo dry run, and React Doctor are pending network restoration. Logs: `/tmp/panabarbero-t1-*.log`.
- 2026-10-26: T1 done at de9b92bc (parent completed install/verification after Codex sandbox limits). T2 started on feat/mobile-app-shell.
- 2026-10-26: T5 implemented in parallel at 0644e682; stack will be reordered to main → workspace → push-backend → mobile-shell → …
- 2026-10-26: Stack #110 submitted: #107 workspace, #108 push backend, #109 mobile shell. T3 auth in progress on feat/mobile-auth; T4 query done at 9ffd7981 (to be stacked above auth).
- 2026-10-26: Review fixes landed: e46b07ae on #107 (Convex env names, Vercel from root, biome JSON, turbo inputs), shell follow-up on #109 (expo-system-ui, AGENTS.md, surface border scope). #111 auth and #112 gate opened. T6 started on feat/mobile-push-registration.
- 2026-10-27: #113 push registration (+07017c3e review fix) and #114 agenda read-only opened. Review fixes f7f92f63 (#111), 6770b3e5 + ce7f343b (#112). T7 layer 2 (actions) started.
- 2026-10-27: #115 agenda actions and #116 inbox opened; #114 got fcbdb316 (Codex P2 fixes). T9 profile in progress on feat/mobile-profile (worktree).
- 2026-10-27: #117 profile opened. Review fixes 0ba36592 (#115), 9a83f4f0 (#116). All nine ODD tasks implemented; pending: simulator pass for inbox/profile, WorkOS redirect URI, EAS project id, Vercel Root Directory, push runtime verify on dev deployment.
- 2026-10-27: Sign-in test showed WorkOS rejecting `exp://…` redirect; T10 fixed in #111, stack rebased + pushed. Probe: client id accepts `localhost:3000/callback` only, so the dashboard entry was added in another WorkOS environment. T11 (#118) and T12 (#119) opened. Dev deployment holds #103 WhatsApp-only data (14 profiles, usage, extraCredits, 3 inbound rows); reshape pending user decision. T13 started.
- 2026-10-28: T13 done (#120). Stack is 13 PRs: #107–#117, #118 authz, #119 dispatcher, #120 deps. Open: dev-data reshape for `convex dev --once`, WorkOS redirect in the right environment, Vercel Root Directory, EAS id.
