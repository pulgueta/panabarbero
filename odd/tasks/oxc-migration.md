# Oxc migration

## Objective

Replace Biome with Oxc (`oxfmt` + `oxlint`) on branch `chore/oxc-migration`, stacked on `feat/whatsapp-component` (PR #103).

## Problem

Biome 2.5.8 does the formatting and linting. The other projects of the owner (`voluptas`, `pupstat-relay`) use Oxc with the Ultracite presets (anti-slop, core, react, shadcn, tanstack, vitest), React Doctor and complexity JS plugins, and type-aware lint.

## Constraints

- Keep the current style: 2 spaces, double quotes, semicolons, trailing commas `all` (Biome default), line width 80.
- After the first `oxfmt` run, the source diff must be very small. Measure it; tune options until it is.
- Do not mass-change code to fix lint findings in this PR without owner approval.
- pnpm only. Commits are `type(scope): description`, no body.

## Acceptance criteria

- `@biomejs/biome` and `biome.json` removed; no Biome references in scripts, CI, editor settings, or agent docs (prose that names Biome in third-party skill files stays).
- `oxfmt.config.ts` and `oxlint.config.ts` present; `pnpm format` and `pnpm lint` use them.
- First format run diff is small and reported (files, lines).
- CI workflow runs Oxc instead of `biome ci`.
- `pnpm build` exits 0.

## Tasks

- [x] T1 Install Oxc tooling, write `oxfmt.config.ts`, tune to minimal diff, apply format. Route: delegated writer (config tuning + many files touched by format).
- [x] T2 Write `oxlint.config.ts` with the Ultracite presets and plugins; report findings per rule. Route: same writer.
- [x] T3 Replace Biome in scripts, CI (`biome.yaml`, `release.yml`, `RELEASES.md`), `.vscode/settings.json`, `biome-ignore` comments, `AGENTS.md`/`ARCHITECTURE.md`. Route: same writer.
- [ ] T4 Decide lint finding policy with owner, then apply.
- [ ] T5 Open PR against `feat/whatsapp-component`.

## Progress

- Branch `chore/oxc-migration` created from `e096eb36`.
- T1–T3 done by the delegated writer (not committed).

## Evidence

- Installed (exact): oxfmt 0.74.0, oxlint 1.89.0, oxlint-tsgolint 7.0.2004, ultracite 8.0.2, oxlint-plugin-react-doctor 0.9.18, oxlint-plugin-complexity 4.0.0, @shadcn/lint 0.2.3. Removed @biomejs/biome and `biome.json`. `@biomejs/biome` stays in the lockfile only as a resolved optional peer of ultracite.
- oxfmt option measurement (source files, on top of the Biome-equivalent base): base 11 files +49/-43; `sortImports` (Ultracite) 121 files +173/-93; `sortImports` without newlines, partitioned by newline and comment 52 files +96/-90 (the remainder is `convex/server` vs `convex-helpers` order: Biome puts `/` before `-`); `sortTailwindcss` 173 files +659/-653 (Biome functions only: 143 files); `trailingComma: "es5"` 273 files +2021/-2030; `quoteProps: "consistent"` 24 files; `quoteProps: "preserve"` and `proseWrap` 0 extra; `sortPackageJson` 2 files (`package.json`, `emails/package.json`), kept.
- Final config: Ultracite oxfmt preset + `trailingComma: "all"`, `sortImports: false`, `sortTailwindcss: false`, Biome scope via `ignorePatterns`. First run: 11 `src` files +49/-43 (10 files: interface `extends` clause layout; 1 file: `&&` chain indent in a call argument). `oxfmt --check` exit 0 on 464 files.
- oxlint (Ultracite anti-slop, core, react, shadcn, tanstack, tanstack/js-plugins, vitest, react-doctor; type-aware + typeCheck): 7502 errors in 420 files, 179 rules. React Compiler rules active from the Ultracite react preset (purity 10, refs 25, set-state-in-effect 22, use-memo 1, incompatible-library 2). Convex `biome-ignore` comments replaced with `oxlint-disable` comments; 2 unused ones removed. 39 `biome-ignore` comments in `src` remain for T4.
- `pnpm build` exit 0. `tsc --noEmit -p .` exit 0, 0 errors.

## Next step

- T4: owner decides the lint finding policy (CI `oxlint` step fails until then).
