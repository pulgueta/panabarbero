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
| T6 | Mobile push registration + deep links | delegated | pending | |
| T7 | Agenda + appointment actions | delegated (Claude writer, UI) | pending | |
| T8 | Notifications inbox | delegated | pending | |
| T9 | Profile + settings | delegated | pending | |

## Acceptance criteria

- `pnpm install` and `turbo run build typecheck lint` pass at the root.
- Web build output and routes unchanged.
- Mobile app signs in, gates non-barbershop users, shows the owner's day agenda.
- A notification created on the backend reaches a registered Expo token.

## Forecast

Authored changed lines ≈ 3500 across 9 PRs. Running count: ~430 (T1) + 157 (T5) + 421 (T2) + ~600 (T3) + ~260 (T4) ≈ 1870 authored lines across PRs #107/#108/#109/#111/#112.

## Progress log

- 2026-10-26: exploration done (4 handoffs). Plan written. Stack root created.
- 2026-10-26: T1 started: converting the root package into a pnpm/Turborepo workspace. Explicit instruction forbids work-unit commits; progress remains uncommitted.
- 2026-10-26: T1 structural conversion completed: web moved to `apps/web`; Convex and email sources moved to `packages/backend`; workspace manifests, Turbo, CI cwd, aliases, and ignores updated. `git mv` could not write `.git/index.lock` in this sandbox, so the required renames are unstaged filesystem moves. `pnpm install` cannot finish because pnpm 11 defaults `verifyDepsBeforeRun` to `install`; its supply-chain metadata check reaches the registry and returns `ENOTFOUND`, leaving `node_modules` incomplete. The existing lockfile still has only the root importer, so it cannot restore the workspace without a successful lockfile-generating install; package checks, build, Biome, Turbo dry run, and React Doctor are pending network restoration. Logs: `/tmp/panabarbero-t1-*.log`.
- 2026-10-26: T1 done at de9b92bc (parent completed install/verification after Codex sandbox limits). T2 started on feat/mobile-app-shell.
- 2026-10-26: T5 implemented in parallel at 0644e682; stack will be reordered to main → workspace → push-backend → mobile-shell → …
- 2026-10-26: Stack #110 submitted: #107 workspace, #108 push backend, #109 mobile shell. T3 auth in progress on feat/mobile-auth; T4 query done at 9ffd7981 (to be stacked above auth).
- 2026-10-26: Review fixes landed: e46b07ae on #107 (Convex env names, Vercel from root, biome JSON, turbo inputs), shell follow-up on #109 (expo-system-ui, AGENTS.md, surface border scope). #111 auth and #112 gate opened. T6 started on feat/mobile-push-registration.
