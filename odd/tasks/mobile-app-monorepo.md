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
| T1 | Turborepo workspace: move web, backend, emails; root config; CI cwd | delegated (Codex, mechanical, 2+ files) | blocked | Structural conversion complete; pnpm 11 auto-installs before scripts because the lockfile lacks workspace importers and `node_modules` is incomplete. Its default supply-chain metadata check reaches the registry and hits DNS `ENOTFOUND`; the sandbox also prevents `git mv`/index writes, so moves are unstaged filesystem renames. |
| T2 | Expo SDK 58 shell with HeroUI Native, theme tokens, Convex client | delegated (Claude writer, UI) | pending | |
| T3 | WorkOS PKCE auth + ConvexProviderWithAuth | delegated (Claude writer) | pending | |
| T4 | Access gate query + gate screen | delegated | pending | |
| T5 | Push backend: component, pushTokens, pref migration, recordInApp hook | delegated (Codex) | pending | |
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

Authored changed lines ≈ 3500 across 9 PRs. Running count: 0.

## Progress log

- 2026-10-26: exploration done (4 handoffs). Plan written. Stack root created.
- 2026-10-26: T1 started: converting the root package into a pnpm/Turborepo workspace. Explicit instruction forbids work-unit commits; progress remains uncommitted.
- 2026-10-26: T1 structural conversion completed: web moved to `apps/web`; Convex and email sources moved to `packages/backend`; workspace manifests, Turbo, CI cwd, aliases, and ignores updated. `git mv` could not write `.git/index.lock` in this sandbox, so the required renames are unstaged filesystem moves. `pnpm install` cannot finish because pnpm 11 defaults `verifyDepsBeforeRun` to `install`; its supply-chain metadata check reaches the registry and returns `ENOTFOUND`, leaving `node_modules` incomplete. The existing lockfile still has only the root importer, so it cannot restore the workspace without a successful lockfile-generating install; package checks, build, Biome, Turbo dry run, and React Doctor are pending network restoration. Logs: `/tmp/panabarbero-t1-*.log`.
