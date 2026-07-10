# Dashboard Redesign — Design Brief

Canonical plan for the barbershop management dashboard redesign
(`barbershop-workflow-redesign`). Extends `DESIGN.md` / `PRODUCT.md`; does not
replace them. Read `DESIGN.md` before touching any section.

## Goal

Recompose the authenticated dashboard (`/profile/barbershops/*`) for
owners/barbers/staff around a **composable page shell + reusable table/form
primitives**, fix the wasted-width and cut-divider layout bugs, deepen the
sidebar with **nested sections**, add a **Reseñas analytics** section, and
upgrade Citas to a **self-contained calendar module**. Inspiration: Square UI
(vault/inventory/skyport/notes) + big-calendar. Preserve the design system:
neutral surfaces, hairline borders, single barber-pole-red accent, Geist,
es-CO, WCAG 2.2 AA, **icon restraint** (icons only when they carry meaning).

## Locked decisions

1. **Full width, edge-to-edge.** Remove `mx-auto max-w-6xl`. Content + topbar
   share one responsive horizontal gutter (`px-4 md:px-6`) that matches the
   sidebar-icon left inset, aligned at every breakpoint. Inner content blocks
   may cap width per-section (derived by inspecting the live layout), but the
   section itself is full width. Remove the cut vertical `<Separator/>` before
   the breadcrumb.
2. **Reviews star histogram** via a new `by_barbershopId_and_rating` index
   (5 counts), **not** a new aggregate — avoids the 5-site dual-write landmine.
3. **Foundation-first sequencing** (see Phases).
4. **Citas:** full month/week/day **+ agenda**, drag-to-reschedule.
5. **Reseñas:** rich analytics (distribution + trend + per-barber/service +
   table + moderation queue). Eligibility rule (review only after a *completed*
   service) already exists server-side — this is a read/analytics surface only.
6. **Pana in-dashboard:** chat + threads + knowledge (RAG KB) + memory, nested
   drawer navigation.
7. **Tables:** TanStack Table manual mode + Convex; default pagination =
   reactive **load-more** (`usePaginatedQuery`); numbered prev/next reserved
   for true archives.

## Architecture

### Composable page shell (`DashboardPage`)
Compound, slots not prop-bag (per `vercel-composition-patterns`):
```
<DashboardPage>
  <DashboardPage.Header>
    <DashboardPage.Title/> <DashboardPage.Description/>
    <DashboardPage.Actions>…primary action…</DashboardPage.Actions>
  </DashboardPage.Header>
  <DashboardPage.Stats/>     {/* optional KPI strip */}
  <DashboardPage.Content/>   {/* table / calendar / grid */}
</DashboardPage>
```
Replaces the duplicated `flex justify-between` header rows and the title-only
`DashboardHeader`. Preserves the view-transition names on title/description.

### Composable DataTable
`useDataTable` hook (owns `useReactTable` in manual mode) + `DataTableContext`.
Compound surface: `DataTable` (provider) › `Toolbar` (Search, FacetedFilter×N,
ViewOptions) › `Content` (Table + header groups; switches Skeleton/Empty/rows) ›
`Pagination` (`mode="load-more" | "cursor"`). `DataTableColumnHeader` (sortable)
and `DataTableRowActions` (data-driven dropdown) live in the column defs. Facet
options come from Convex queries/enums, not TanStack row models. `getRowId =
r => r._id`, `autoResetPageIndex: false`, debounce free-text ~300ms. Columns via
per-section `get<Section>Columns()` factories.

### Form pages + live preview
Forms >6 fields / growable / multi-section move to dedicated routes with a
two-column layout (fields | live responsive preview). State lifted to a provider
so the preview reads form context (composition pattern). **No API contract
changes** — only UI composition + the new submission trigger's navigation.
Migrations: product create/edit, service recipe (growable), availability matrix,
full "crear cita". Kept as modals: invitar miembro, quick stock adjust,
cancel/confirm dialogs.

### Nested sidebar
Wire the existing `Collapsible` + `SidebarMenuSub*` primitives. Groups:
- **Operación:** Citas · Servicios · Inventario
- **Barbería:** Equipo *(Barberos · Recepcionistas · Invitaciones · Horarios)* ·
  Reseñas · Ajustes *(Perfil · Ubicación · Disponibilidad · Marca · Preferencias
  · Facturación)*
- **Asistente:** Pana *(Chat · Conocimiento · Memoria)*
- **Footer:** plan/usage meter (Mercado Pago) + account menu.

### Skeletons
Per-section skeletons mirror the loaded layout: static elements exact height,
data-driven containers dynamic height, no full-screen overlay on mobile. Replace
the generic `DashboardPending` with route-accurate skeletons as each section
ships.

## Backend (additive only)

- **Reviews reads (new):** `reviews.listForShop` (zAuthQuery, role-gated,
  paginated), `by_barbershopId_and_rating` index for the histogram,
  per-barber/per-service breakdown, trend via `reviewRatingsAggregate`
  `_creationTime` bounds, moderation-queue query. Pattern: copy
  `inventory.getValuation` (zAuthQuery + `barbershop` arg + role assert).
- **Calendar reschedule:** reuse existing reschedule mutations; add a thin
  owner-move mutation only if drag needs a distinct submission path. Respect the
  "one reschedule per user / 30 min" rule.
- Reviews eligibility (completed-service gate via single-use `reviewCode`)
  already exists — do not rebuild.

## Key files

- Shell: `src/routes/_authedRoutes/profile/barbershops/route.tsx`,
  `src/components/dashboard/dashboard-topbar.tsx`,
  `src/components/dashboard/dashboard-sidebar.tsx`,
  `src/components/dashboard/dashboard-nav.ts`
- Primitives: `src/components/ui/sidebar.tsx` (SidebarMenuSub*, inset math),
  `src/components/table/data-table.tsx` (to redesign),
  `src/components/barbershops/dashboard-header.tsx` (→ DashboardPage)
- Convex: `convex/reviews.ts`, `convex/schema.ts`, `convex/aggregates.ts`,
  `convex/appointments.ts`, `convex/inventory.ts`, `convex/index.ts` (zAuth
  wrappers), `convex/authz.ts` (role asserts)

## Phases (foundation-first)

- **Phase 0 — Foundation:** DashboardPage, DataTable, form-page + preview,
  skeleton conventions, DESIGN.md amendments.
- **Phase 1 — Shell & nested sidebar:** full-width + separator fix, nav
  reorg + nesting, plan meter. Verify live.
- **Phase 2 — Sections (one at a time, each incl. skeleton, verified before the
  next):** Inventario → Servicios → Equipo → Ajustes (split) → Reseñas (+backend)
  → Citas (calendar) → Pana (in-shell).
- **Phase 3 — Polish:** skeleton parity, a11y/contrast, motion + reduced-motion,
  `doctor:diff`, lint/format, `build` exit 0.

## Gates (per `AGENTS.md` §5)

`pnpm doctor:diff` (React), `pnpm lint`/`format` (own files), `pnpm build`
exit 0, live agent-browser verification for shell/router/SSR changes (no avatar
flicker, no `_nonReactive` error, no hydration mismatch, theme stays on system).
