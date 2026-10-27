# apps/mobile — PanaBarbero mobile app

Expo SDK 58 + Expo Router + HeroUI Native (Uniwind / Tailwind v4) on the shared Convex backend
(`@panabarbero/backend`). The root `AGENTS.md` and `ARCHITECTURE.md` apply here too. This file
only adds what is specific to the mobile app.

## Rules

- **pnpm only.** Run everything through the workspace filter, never `npx`/`bunx` directly:
  `pnpm --filter @panabarbero/mobile exec expo <cmd>`.
- **Expo-managed packages** go in with `pnpm --filter @panabarbero/mobile exec npx expo install <pkg>`
  so versions match the SDK. Other packages use `pnpm --filter @panabarbero/mobile add <pkg>`.
- **Lint and format with Biome** from the repo root (`pnpm exec biome check --write apps/mobile/src`).
  Do not run `expo lint`; this repo has no ESLint.
- **Typecheck:** `pnpm --filter @panabarbero/mobile typecheck`.
- **Native folders are generated** (Continuous Native Generation). Never edit `ios/` or `android/`;
  configure native behaviour in `app.json` and config plugins. After adding a package with native
  code, rebuild the dev build: `pnpm --filter @panabarbero/mobile ios`.
- **Expo APIs change every SDK.** Check `https://docs.expo.dev/versions/v58.0.0/` or
  `https://docs.expo.dev/llms.txt` before using an API from memory.

## Structure

- `src/app/` — routes only (`_layout.tsx` files define navigators; `(auth)` and `(app)` groups).
- `src/components/`, `src/hooks/`, `src/lib/`, `src/providers/` — non-route code.
- `src/global.css` — HeroUI theme set to the web design tokens (`apps/web/src/styles.css`).
  Keep both palettes in sync. Neutrals have zero chroma; one red accent; borders over shadows.
- Backend API: `import { api } from "@panabarbero/backend/convex/_generated/api"`.

## Copy

User-facing text is Spanish (es-CO), sentence case, no exclamation marks. Code, comments and
identifiers are English.

## Verify in the simulator

```sh
pnpm --filter @panabarbero/mobile ios            # build + install the dev build
pnpm --filter @panabarbero/mobile dev            # Metro
xcrun simctl io booted screenshot /tmp/shot.png  # capture
```
