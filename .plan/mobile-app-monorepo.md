# Mobile app + Turborepo monorepo

Date: 2026-10-26. Branch stack root: `main` @ `e7ff4cc0`.

## Objective

Add a barbershop-only mobile app (Expo SDK 58, Expo Router, HeroUI Native) that reuses the
Convex backend, and convert the repository into a Turborepo pnpm workspace. The web app keeps
every current feature. Delivery is a stack of small PRs so bots and humans review each layer.

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Layout | `apps/web` (TanStack Start), `apps/mobile` (Expo), `packages/backend` (`convex/` + `emails/`) | Matches the official Convex Turborepo template. `emails/` moves with the backend so `convex/emails.ts` keeps its relative import. |
| Backend imports | Web keeps the `@convex/*` tsconfig path, now pointing at `../../packages/backend/convex/*`. Mobile imports `@panabarbero/backend/convex/_generated/api` deep paths. | Zero churn on 155 web imports. Deep paths are what Convex documents for monorepos. |
| pnpm linker | Keep the default isolated linker. Fall back to `nodeLinker: hoisted` only if Metro fails. | Expo supports isolated installs from SDK 54. |
| Mobile auth | WorkOS AuthKit PKCE with `expo-auth-session` + `expo-secure-store`, same `WORKOS_CLIENT_ID` as web, `ConvexProviderWithAuth` with refresh. | WorkOS ships no Expo SDK. Same client id means no `auth.config.ts` change. |
| Access gate | New `mobileAccess.getAccess` query: membership roles + owner plan status. No membership or no active plan shows a gate screen. | Server already enforces every rule in `acl.ts` / `authz.ts`; the gate only shapes the UI. |
| Store compliance | Gate copy is neutral: it states the app is for barbershop teams with an active PanaBarbero plan. No price, no purchase button, no purchase link. Submission framing: Apple 3.1.3(c) business plans sold to barbershops for their staff. | Apple 3.1.1 / 3.1.3(b) reject web-only consumer subscriptions outside the US. Google allows unlinked text for consumption-only apps. |
| Theme | Mobile `global.css` maps HeroUI Native variables to the web oklch values from `src/styles.css`. Geist font, Phosphor icons, radius 8px. | HeroUI Native themes via Uniwind use oklch CSS variables, same as the web. |
| Calendar | Native day agenda list, not a port of the 10k-line web calendar. HeroUI Calendar/DatePicker are Pro-only. | Pro components are out of budget. |
| Push | `@convex-dev/expo-push-notifications` 0.4.x. New `pushTokens.ts` with its own rate-limit name. Send hook in `recordInApp` (`convex/notifications.ts`). Prefs enum gains `push`. | `recordInApp` is the one place on `main` that has recipient id and copy. PR #103 adds a central dispatcher; the hook moves there after #103 lands. |
| Model routing | Codex (gpt-5.6) for mechanical slices (workspace move, backend wiring). Claude Opus/Fable for user-facing UI and reviews. | Per repo model guidance. |

## Stack (bottom to top)

| # | Branch | Deliverable | Verify |
| --- | --- | --- | --- |
| 1 | `chore/monorepo-workspace` | Turborepo + pnpm workspace. Move `src/` to `apps/web`, `convex/` and `emails/` to `packages/backend`. Root `turbo.json`, scripts, biome globs, CI cwd, docs paths. | `pnpm install`, `pnpm -F web build`, `tsc -p apps/web`, `tsc -p packages/backend/convex`, `biome ci .` |
| 2 | `feat/mobile-app-shell` | Expo SDK 58 app with Expo Router, HeroUI Native + Uniwind, web theme tokens, Geist, Phosphor, Convex client. | `tsc`, `expo export --platform ios`, run on iPhone 18 Pro simulator, screenshot |
| 3 | `feat/mobile-auth` | WorkOS PKCE sign-in, SecureStore session, refresh, `ConvexProviderWithAuth`, `(auth)` / `(app)` route groups, sign out. | Sign in with test persona on simulator |
| 4 | `feat/mobile-access-gate` | `mobileAccess.getAccess` query + gate screen with compliant copy. | Customer persona sees gate; owner persona enters |
| 5 | `feat/push-notifications-backend` | Component install, `pushTokens.ts`, `push` pref + migration, send hook in `recordInApp`. | `convex dev --once`, `tsc`, send a test notification via `--identity` |
| 6 | `feat/mobile-push-registration` | `expo-notifications` permission + token record, tap deep links, pref toggle. | Simulator `.apns` payload opens the right route |
| 7 | `feat/mobile-agenda` | Day agenda, appointment detail, complete / no-show / cancel, reschedule requests. | Owner persona day with seeded appointments |
| 8 | `feat/mobile-notifications-inbox` | Inbox, unread badge, mark all read. | Simulator |
| 9 | `feat/mobile-profile-settings` | Account, notification prefs, barber schedule view, theme toggle, sign out. | Simulator |

Phase 2 (new stacks after this one lands): team, services, inventory, sales, reviews, analytics,
Pana chat, shop settings.

## User actions required

- WorkOS dashboard: add redirect URI `panabarbero://auth/callback` to the AuthKit app.
- Vercel: set the project Root Directory to `apps/web` before merging PR 1.
- Expo: create the EAS project id for push tokens before PR 6 is tested on a device.

## Out of scope

- Deleting or hiding any web feature.
- In-app purchases.
- WhatsApp dispatcher changes from PR #103.
