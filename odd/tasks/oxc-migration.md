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
- [x] T6 Fix review + smoke regressions. Route: delegated writer (2+ non-trivial files; review and browser smoke findings).
- [x] T5 Open PR against `feat/whatsapp-component`. Evidence: #104 (base `feat/whatsapp-component`); WhatsApp commits pushed to #103 first.
- [x] T7 CI: `oxc.yaml` used `branches: ["*"]`, which does not match base branches with `/`, so the job never ran on #104. Changed to `"**"`, added `--format github`, pinned every action to its latest release hash (checkout v7.0.1, pnpm/action-setup v6.1.0, setup-node v7.1.0, pullfrog v0.1.101, react-doctor v2.4.0). Route: inline. Evidence: run 39908012096 `oxc` success. Commits: 65f1c406, bb636325. Vercel preview fails on #103 commits too (e096eb36), not from this branch.
- [x] T8 Update dependencies and pnpm. Route: delegated writer (root `package.json`, lockfile, and the call sites that the new versions break). Evidence: see "T8 Dependency update".

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

## T6 Review and smoke fixes

- Numeric inputs: the service price/duration and grace-period inputs store the raw input string once edited, so the T4 removal of `Number(...)` sent strings to Convex (ArgumentValidationError). The form value types now say `number | string` and the submit converts with `Number(...)` again; empty-input validation stays as before (`z.coerce`).
- New appointment: the auto-selected barber (only barber, or the barber themself) is sticky again: one state, set during render when the auto value changes; the user can pick another barber.
- Settings general info and address: inputs are controlled (`value`), so Base UI no longer logs the uncontrolled default-value change on each keystroke.
- Reverse geocode: the response schema accepts `null` fields (`.nullish()`), as the old falsy fallthrough did.
- Customer booking: a cleared barber select writes `undefined` through instead of being ignored.
- Chat thinking phrase: `charCodeAt` restored (scoped disable) so the phrase hash stays the same.
- `SAFETY:` notes merged into the `oxlint-disable-next-line` reasons (11 sites); the anti-slop rule accepts them.
- Inventory history: audit rows are parsed one by one with `safeParse`; a row that does not match is skipped, the page does not go blank.
- Conversion audit (`git diff 5a0babf7..HEAD`, removed `Number(`/`String(`/`Boolean(`/`parseInt(`/`!!`): only the service and grace-period sites were wrong; the other sites already had the converted type at runtime (regex digit groups, chart tooltip helpers, Base UI boolean callbacks, boolean role flags, number fields with numeric `onChange`, submit-time `parse*` helpers in the stock dialog).

### T6 commits

- `ccc8b5fa` fix(forms): keep numeric fields numeric
- `56130ade` fix(appointments): keep auto-selected barber sticky
- `247d76cb` fix(settings): keep name and address inputs stable
- `9c52df81` fix(geocode): accept null place fields
- `1c63cd84` fix(booking): write a cleared barber select through
- `205e95bf` fix(chat): keep the thinking phrase hash stable
- `ae892ddd` refactor(lint): merge safety notes into disable reasons
- `60287190` fix(inventory): skip malformed audit rows

### T6 verification

- `oxlint`: exit 0, no output. `oxfmt --check`: exit 0.
- `tsc --noEmit` for `.`, `convex`, `emails`: 0 errors each.
- `pnpm test`: 19 passed. `pnpm build`: exit 0.
- Not done: browser re-check of the fixed flows.

## T8 Dependency update

- pnpm 11.22.0 -> 12.15.0 (`packageManager`). The lockfile now has the pnpm 12 `packageManagerDependencies` document. `pnpm/action-setup` v6.1.0 supports pnpm 12 and reads `packageManager`; CI needs no change.
- `pnpm update --latest` (root only), with the `minimumReleaseAge` gate (1 day). No new `minimumReleaseAgeExclude` entries.
- Major bumps taken: `@convex-dev/aggregate` 0.2 -> 0.3, `@shadcn/helpers` 0.2 -> 0.3, `@tanstack/react-hotkeys` 0.10 -> 0.16, `@tanstack/react-pacer` 0.23 -> 0.24, `@tanstack/react-pacer-devtools` 0.8 -> 0.9, `motion` 13 -> 14, `vitest` 4 -> 5, `@workos/authkit-tanstack-react-start` 0.11 -> 0.12. No call-site change was necessary for them.
- Code changes for the new versions:
  - `@tanstack/react-query` 5.104 deprecates `ensureQueryData`, `prefetchQuery`, `fetchQuery` (`typescript/no-deprecated`, 134 sites). Replaced with `query({ ...opts, staleTime: "static" })`, `query(opts).catch(noop)`, and `query(opts)`; equal behaviour in query-core 5.104.5 (no call site uses `select`). The billing loader uses `Promise.allSettled` for its two streamed queries (`promise/no-nesting`). `ARCHITECTURE.md` lines 50-51 and 213 and `docs/inventory-design.md` still name the old methods (outside this task's edit surface).
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

### T8 verification

- `oxlint`: 0 findings. `oxfmt --check`: exit 0.
- `tsc --noEmit` for `.`, `convex`, `emails`: 0 errors each.
- `pnpm test`: 19 passed. `pnpm build`: exit 0. `pnpm install --frozen-lockfile`: pass.
- Not done: browser check of loaders (query migration), error boundary, map, and Convex deploy of the updated components (`aggregate` 0.3, `workpool`, `workflow`).

### T8 commits

- `39db598c` chore(pnpm): update to 12.15.0
- `8257a0a7` chore(deps): update dependencies to latest
- `11c9628e` fix(types): load geojson types for maplibre 6.15
- `4e7bdee0` fix(router): narrow unknown route errors
- `a6f29a38` fix(reviews): convert workpool callback fields for zod 4.6
- `684d7e8b` refactor(query): replace deprecated query client methods

## Next step

- Review the T4 behaviour-risky changes, check the app in the browser, then T5 (open the PR).
