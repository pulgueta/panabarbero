# ODD feature: mobile-native-parity

Locator: `odd/tasks/mobile-native-parity.md`. Engram topic: `odd/mobile-native-parity/tasks`.
Delivery strategy: `auto-chain`, chain strategy `stacked-to-main` via `gh stack` (user request).
RDD: off (global). Merge rule (user): merge a PR only after its reviews pass and the behavior is
proven on the iPhone 18 Pro and the Pixel 10 Pro simulators.

## Objective

Bring every mobile feature above 9/10 for design, UI hierarchy and native primitive fidelity on
iOS 27 and Android 17, on Expo SDK 58, with fallbacks for older OS versions.

## Problem / why

The baseline audit (2026-11-09, `origin/main` at bb059a93) found that Android crashes on every
signed-in screen, that no iOS feature reaches 9, and that the code has no OS-version checks.

## Scope and constraints

- `apps/mobile` only, unless a feature needs a backend change.
- Copy: Spanish (es-CO), sentence case. Code and comments: English.
- Native folders are generated. Configure them through `app.json` and config plugins.
- Scope assumption: "all primitives" means every native primitive that maps to a control or flow
  this app has. Primitives that would be new product features (widgets, Live Activities, App
  Intents, quick actions, calendar write, biometrics) need a user decision.
- The main checkout holds uncommitted user PostHog work. All work happens in the worktree
  `~/.t3/worktrees/panabarbero/native-qa`.

## Baseline scores (device QA, axes: design / hierarchy / native / functional)

iOS (iPhone 18 Pro, iOS 27):

| Feature | a | b | c | d |
| --- | --- | --- | --- | --- |
| Sign-in and access gate | 7 | 7 | 6 | 8 |
| Tab shell | 8 | 8 | 7 | 7 |
| Agenda day | 7 | 6 | 5 | 7 |
| Agenda week | 6 | 5 | 5 | 7 |
| Agenda month | 6 | 5 | 5 | 7 |
| Calendar header and picker | 7 | 7 | 5 | 8 |
| Barber chips and Hoy | 7 | 7 | 6 | 9 |
| Link preview and menu | 7 | 6 | 6 | 8 |
| Appointment detail and actions | 7 | 7 | 5 | 7 |
| Create appointment | 6 | 6 | 4 | 5 |
| Notifications inbox | 7 | 7 | 7 | 6 |
| Profile | 7 | 7 | 6 | 8 |
| Deep link with bad id | - | - | - | 1 |
| Dynamic Type at accessibility sizes | 3 | 3 | 2 | 3 |

Android (Pixel 10 Pro, Android 17), after T1:

| Feature | a | b | c | d |
| --- | --- | --- | --- | --- |
| Sign-in | 5 | 5 | 3 | 8 |
| Tab shell | 6 | 7 | 4 | 8 |
| Agenda day, week, month | 6 | 5 | 4 | 6 |
| Calendar header and picker | 6 | 6 | 4 | 7 |
| Appointment detail and actions | 7 | 8 | 5 | 8 |
| Create appointment | 6 | 6 | 4 | 7 |
| Notifications inbox | 7 | 7 | 5 | 6 |
| Profile | 7 | 7 | 4 | 6 |
| Dark theme and system bars | 6 | 7 | 5 | 6 |
| Deep link error state | 6 | 6 | 6 | 9 |
| Large text | 7 | 7 | 6 | 8 |

## Tasks

| ID | Task | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T1 | Fix the Android tab crash and the bad deep link crash; add error boundaries | inline (small, understood) | verified, PR pending | RED: logcat `NativeTabs.Trigger.Icon md icons on Android require expo-symbols`; iOS red box `Invalid ID length 7`. GREEN: tab shell renders on Pixel 10 Pro; "No pudimos abrir esta cita." with working "Volver a la agenda" on both devices. tsc and Biome pass. |
| T2 | Android baseline QA after T1 | delegated QA | done | Scores above; no "nearby devices" prompt with a localhost Metro host, so that prompt is a dev-only LAN effect |
| T3 | Foundation: system bars follow the app theme, Android tab palette, predictive back, keyboard mode, brand icons, EAS config, OS-version helper | delegated writer | pending | |
| T4 | Native controls: segmented control, switch, confirmation dialogs, feedback on both OSes | delegated writer | pending | |
| T5 | Agenda: view switcher placement, paging, picker, targets, loading and empty states | delegated writer | pending | |
| T6 | Appointment detail: native sheets, toolbar actions, zoom transition, notification routing | delegated writer | pending | |
| T7 | Create appointment: form sheet, native date picker, keyboard, CTA inset, inline errors | delegated writer | pending | |
| T8 | Inbox: pull to refresh, native swipe and menus, error state, correct targets | delegated writer | pending | |
| T9 | Profile: native lists and toggles, sign-out confirmation, push toggle state | delegated writer | pending | |
| T10 | Dynamic Type, touch targets, one-accent rule, final independent scoring | delegated writer and reviewer | pending | |

## Acceptance criteria

- Every feature scores above 9 on design, hierarchy and native fidelity on both devices, judged by
  an independent reviewer from device evidence.
- `pnpm --filter @panabarbero/mobile typecheck` and Biome pass for each layer.
- Each PR has passing reviews and device proof before merge.

## Exceptions to test-first

`apps/mobile` has no test runner. RED and GREEN evidence comes from the simulators.

## Next step

Open the T1 PR, then T3.
