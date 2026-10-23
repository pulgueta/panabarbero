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
- [x] T4 Decide lint finding policy with owner, then apply. Route: delegated writer (2+ non-trivial files); the writer split the fixes into four parallel partition writers on disjoint paths (convex/tests/emails, calendar group, other components, src outside components).
- [ ] T5 Open PR against `feat/whatsapp-component`.

## Progress

- Branch `chore/oxc-migration` created from `e096eb36`.
- T1–T3 done by the delegated writer.
- T4 done (lint policy tuned and every finding fixed).

## Evidence

- Installed (exact): oxfmt 0.74.0, oxlint 1.89.0, oxlint-tsgolint 7.0.2004, ultracite 8.0.2, oxlint-plugin-react-doctor 0.9.18, oxlint-plugin-complexity 4.0.0, @shadcn/lint 0.2.3. Removed @biomejs/biome and `biome.json`. `@biomejs/biome` stays in the lockfile only as a resolved optional peer of ultracite.
- oxfmt option measurement (source files, on top of the Biome-equivalent base): base 11 files +49/-43; `sortImports` (Ultracite) 121 files +173/-93; `sortImports` without newlines, partitioned by newline and comment 52 files +96/-90 (the remainder is `convex/server` vs `convex-helpers` order: Biome puts `/` before `-`); `sortTailwindcss` 173 files +659/-653 (Biome functions only: 143 files); `trailingComma: "es5"` 273 files +2021/-2030; `quoteProps: "consistent"` 24 files; `quoteProps: "preserve"` and `proseWrap` 0 extra; `sortPackageJson` 2 files (`package.json`, `emails/package.json`), kept.
- Final config: Ultracite oxfmt preset + `trailingComma: "all"`, `sortImports: false`, `sortTailwindcss: false`, Biome scope via `ignorePatterns`. First run: 11 `src` files +49/-43 (10 files: interface `extends` clause layout; 1 file: `&&` chain indent in a call argument). `oxfmt --check` exit 0 on 464 files.
- oxlint (Ultracite anti-slop, core, react, shadcn, tanstack, tanstack/js-plugins, vitest, react-doctor; type-aware + typeCheck): 7502 errors in 420 files, 179 rules. React Compiler rules active from the Ultracite react preset (purity 10, refs 25, set-state-in-effect 22, use-memo 1, incompatible-library 2). Convex `biome-ignore` comments replaced with `oxlint-disable` comments; 2 unused ones removed. 39 `biome-ignore` comments in `src` remain for T4.
- `pnpm build` exit 0. `tsc --noEmit -p .` exit 0, 0 errors.

## T4 lint policy: "Tune, then fix"

Owner policy: turn off style rules that fight the house style, keep correctness, type-safety, React Compiler, a11y, React Doctor, and anti-slop substance rules as `error`, fix every other finding.

### Rules turned off (baseline counts, 7502 findings before T4)

| Rule | Count | Reason |
| --- | ---: | --- |
| anti-slop/require-readable-spacing | 1630 | blank-line style |
| typescript/strict-boolean-expressions | 748 | truthiness checks are the house style |
| eslint/func-style | 715 | function declarations are the house style |
| shadcn/no-restyle | 477 | follow-up (design rules) |
| eslint/curly | 379 | single-line `if` is the house style |
| typescript/no-confusing-void-expression | 193 | idiomatic arrow handlers |
| typescript/promise-function-async | 153 | style |
| react/function-component-definition | 120 | style |
| shadcn/no-inline-styles | 95 | follow-up (design rules) |
| eslint/prefer-destructuring | 78 | style |
| eslint/no-await-in-loop | 71 | sequential awaits are deliberate in Convex mutations |
| eslint/no-nested-ternary | 66 | style |
| unicorn/switch-case-braces | 66 | style |
| eslint/arrow-body-style | 65 | style |
| typescript/strict-void-return | 58 | idiomatic handlers |
| shadcn/no-arbitrary-values | 56 | follow-up (design rules) |
| shadcn/no-raw-colors | 49 | follow-up (design rules) |
| eslint/no-negated-condition, unicorn/no-negated-condition | 45 + 45 | style |
| typescript/array-type | 43 | style |
| typescript/method-signature-style | 39 | style |
| unicorn/numeric-separators-style | 36 | style |
| eslint/require-unicode-regexp | 35 | style |
| typescript/consistent-type-definitions | 31 | style |
| eslint/no-plusplus | 30 | style |
| eslint/no-inline-comments | 29 | comment placement style |
| eslint/prefer-named-capture-group | 19 | regex naming preference |
| unicorn/prefer-ternary | 12 | style |
| unicorn/no-array-reduce | 6 | style |
| react-doctor/query-mutation-missing-invalidation | 47 | false positive: Convex queries are reactive subscriptions |
| react-doctor rules silenced in `doctor.config.ts` | 53 | only-export-components 32, no-adjust-state-on-prop-change 9, prefer-module-scope-static-value 7, others 5 — mirrors the team decisions |
| react-doctor/* in `convex/**` | 29 | `doctor.config.ts` ignores convex (async-await-in-loop 29) |
| unicorn/prefer-at in `convex/**` | 1 | `convex/tsconfig.json` lib is ES2021 |
| `src/components/calendar/**` (ignore pattern) | 262 | vendored ReUI registry component, like `src/components/ui/**` |

### Rules kept on with options

- `typescript/only-throw-error`: allows TanStack `Redirect` / `NotFoundError` (54 false positives on `throw redirect()` / `throw notFound()`).
- `typescript/prefer-nullish-coalescing`: `ignorePrimitives.string` — `||` on strings is the intended empty-string fallback.
- `eslint/no-void`: `allowAsStatement` — `void promise` marks intended fire-and-forget.
- `eslint/no-use-before-define`: `{ functions: false, classes: true, variables: true }` (hoisted declarations).
- `unicorn/no-useless-undefined`: `checkArguments: false` (`.eq("deletedAt", undefined)` states intent in Convex filters).
- `anti-slop/no-runtime-typeof`: `allowInTypeGuards`.
- `import/consistent-type-specifier-style`: `prefer-top-level` (Ultracite default, matches Biome `useImportType`); 56 fixed.
- Per-file `react-doctor/prefer-dynamic-import` and `tanstack-start-loader-parallel-fetch`, `react/no-danger` overrides mirror `doctor.config.ts`; `src/components/landing/metrics-section.tsx` added to the dynamic-import list.

### Complexity thresholds (= current maximum; they block new, more complex code)

- `eslint/complexity`: `max: 81` (top: `src/components/calendar/calendar-chip.tsx`).
- `complexity/complexity` (oxlint-plugin-complexity): `cyclomatic: 81`, `cognitive: 76`.

### Findings after tuning and fixes

- After tuning: 1831 findings. After safe autofixes (type-only imports, unnecessary assertions, safe unicorn/eslint fixers): 1535. Calendar ignore removed 262.
- Fixed by hand (1273): type safety and assertions 687, promises 274, React Compiler / React Doctor / a11y 122, other 190.
- Scoped disable comments added: 74 lines, all with `-- <reason>` (14 file-level, mostly former `biome-ignore-all` for `no-non-null-assertion` in loader-gated routes). Main rules: no-non-null-assertion 14, no-unsafe-type-assertion 11, no-giant-component 6, prefer-tag-over-role 6, set-state-in-effect 5, tanstack-start-loader-parallel-fetch 5, no-unsafe-argument 4. No `biome-ignore` text remains outside vendored folders.

### Follow-ups

- Shadcn design rules off: `shadcn/no-restyle`, `shadcn/no-inline-styles`, `shadcn/no-arbitrary-values`, `shadcn/no-raw-colors`.
- Split the components with `react-doctor/no-giant-component` disables.
- Decide whether `src/components/calendar/**` (vendored ReUI) gets linted.

### Commits

- `695a04f3` chore(lint): tune oxlint rules to the house style
- `beeff300` style(lint): use top-level type-only imports
- `34b2d6e8` refactor(types): drop unnecessary type assertions
- `73e83c46` refactor(lint): apply safe oxlint autofixes
- `7f095f9e` fix(convex): keep index access under the es2021 lib
- `4a27a0ab` chore(lint): allow typeof inside type guards
- `a037eaf0` chore(lint): build convex react-doctor overrides in one pass
- `dccb04df` chore(lint): ignore vendored calendar and string fallbacks
- `fa336de6` refactor(convex): satisfy oxlint type-safety rules
- `6220c429` refactor(emails): drop useless prop defaults
- `78cbee09` test(whatsapp): rename core test to kebab case
- `c8649373` refactor(types): replace unsafe assertions with narrowing
- `dac76b74` fix(lint): await or void floating promises
- `56017efa` refactor(react): satisfy react compiler and doctor rules
- `a0695aa9` fix(theme): keep empty stored theme falling back to system

### Verification (final)

- `oxlint`: exit 0, 0 warnings, 0 errors.
- `oxfmt --check`: exit 0.
- `tsc --noEmit -p .`: 0 errors. `tsc --noEmit -p convex`: 0 errors. `tsc --noEmit -p emails`: 0 errors (baseline 0 for all).
- `pnpm test`: 1 file, 19 tests passed (baseline same).
- `pnpm build`: exit 0.
- Not done: real-app check with agent-browser for the React refactors and hydration-sensitive files.

## Next step

- Review the T4 behaviour-risky changes, check the app in the browser, then T5 (open the PR).
