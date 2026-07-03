
# AGENTS.md

PanaBarbero is a barbershop marketplace + management app: **TanStack Start (SSR) + Convex + WorkOS AuthKit + Polar + Tailwind v4 / Base UI**. Package manager is **pnpm only**. All user-facing copy is **Spanish (es-CO)**.

> [!IMPORTANT]
> **Code patterns, style, and architecture live in `ARCHITECTURE.md`** — read the relevant section before touching a subsystem. This file (`AGENTS.md`) covers only *how to behave*. Keep both updated as the project evolves.

<!-- intent-skills:start -->
## Skill Loading

Before substantial work:

- Skill check: run `pnpm dlx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `pnpm dlx convex ai-files install`.

<!-- convex-ai-end -->

## 1. The discipline (read before editing anything)

This codebase has had three full backend migrations (auth, notifications, analytics) and carries a **pnpm patch** (`@tanstack/router-core`) and **strict-evaluation config** that punish blind edits. Before you change a file:

1. **Research before code.** Read the file, its imports, its callers, and the relevant section of `ARCHITECTURE.md`. If the change touches Convex, **read the `convex-functions` skill first** (or `convex/_generated/ai/guidelines.md`, present only after `pnpm dlx convex ai-files install`) — those rules override training priors. If it touches a third-party SDK, read the installed source under `node_modules/.pnpm/<pkg>/...` rather than guessing the API.
2. **State assumptions; surface tradeoffs.** If two interpretations exist, name them. If a simpler path exists, say so. If something is unclear, stop and ask — do not paper over confusion with defensive code.
3. **Surgical changes only.** Every changed line must trace to the task. Don'treformat, "improve", or refactor adjacent code. Match existing style. Remove only the orphans *your* change created; flag pre-existing dead code, don't delete it.
4. **Examine edge cases.** Auth latency, SSR/client hydration parity, empty states, post-signup race windows (profile row may not exist yet), plan/role gating, optimistic-update rollback. The landmines around auth (`ARCHITECTURE.md` §2), Convex components (`ARCHITECTURE.md` §1.4), and `"use node"` files are real; re-read those sections when working near them.
5. **Goal-driven verification.** Turn the task into a checkable goal and loop until it passes. The required gates are in §5.

If a senior engineer would call your change overcomplicated or speculative, rewrite it smaller.

### 1.1. Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay, not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model        | cost | intelligence | taste |
|--------------|------|--------------|-------|
| composer-2.5 | 9    | 6            | 6     |
| sonnet-5     | 5    | 5            | 7     |
| opus-4.8     | 4    | 7            | 8     |
| fable-5      | 2    | 9            | 9     |

How to apply:

- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output doesn't meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): composer-2.5 — it's effectively free.
- Anything user-facing (UI, copy, API design) needs taste ≥ 7.
- Reviews of plans/implementations: fable-5 or opus-4.8, optionally composer-2.5 as an extra independent perspective.
- Never use Haiku.
- Mechanics: use `agent -p` when you want Cursor to propose changes, and `agent -p --force` when you want it to apply changes without asking.
- Claude models (sonnet-5, opus-4.8, fable-5) run via the Agent/Workflow model parameter.

Using composer-2.5 inside workflows and subagents:

  1. Write a self-contained Cursor prompt (e.g, `agent -p "What does this code do?"`).
  2. Run `agent -p` to propose changes.
  3. Run `agent -p --force` when changes should be applied automatically.
  4. Return the final result.

composer-2.5 (Cursor's proprietary model) is particularly useful for exploration, codebase discovery, architectural discussions, and implementation work on small-to-medium-sized tasks. For very large, complex tasks or review-heavy work, opus-4.8 or fable-5 generally provide stronger reasoning and code quality.

## 2. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 3. Simplicity & surgical changes

- Minimum code that solves the problem. No speculative features, abstractions for single-use code, configurability that wasn't requested, or error handling for impossible scenarios. If 200 lines could be 50, rewrite it.
- Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Match existing style. Remove only the orphans your change created; flag pre-existing dead code instead of deleting it. Every changed line traces to the task.

## 4. Committing

When asked to commit, group files by relevance and relationship — one commit per logical unit (e.g. Convex backend changes together, UI components together, config/docs together). Never bundle unrelated files into a single commit.

Commit messages must be short: `type(scope): brief description` — no body, no bullet points. The diff is the documentation. Examples:

```sh
feat(appointments): add reschedule request form
fix(auth): seed initialAuth before hydration
chore(convex): update schema validators
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`. Keep scope tight (the domain/folder, not the whole app).

---

## 5. Goal-driven execution & required gates

Turn the task into a verifiable goal and loop until it passes ("add validation"
→ "write tests for invalid inputs, then make them pass"). Before you call a task
done, run:

- `pnpm doctor:diff` — when you touched React. No new regressions vs `main` (a known baseline of pre-existing warnings exists; don't fix unrelated ones).
- `pnpm lint` and/or `pnpm format` on **your** files (double quotes, 2-space indent, `import type` for type-only imports). Don't reformat files you didn't change.
- `pnpm build` (vite) → exit 0 for anything affecting the build/SSR.
- For auth/SSR/router changes, verify in the **real app** via agent-browser (`ARCHITECTURE.md` §4) — confirm no avatar flicker, no `_nonReactive` console error, no hydration mismatch, theme stays on system. tests passing ≠ behavior verified.

Useful commands:

```sh
pnpm dev                                   # convex dev + vite
pnpx convex dev --once                      # one-shot push to Convex Cloud
pnpx convex env list                        # deployment env vars (compare with .env.local on auth issues)
pnpx convex data <table> --limit N          # inspect a table
pnpm doctor:diff                           # react-doctor on the diff
pnpm doctor:full                           # react-doctor on the whole repository
```

**These guidelines are working if:** fewer unnecessary diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
