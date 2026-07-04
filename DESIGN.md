# DESIGN.md

PanaBarbero's design system. `PRODUCT.md` says who we build for and why; this file says what the interface looks like and how it behaves. Every token named here exists in `src/styles.css` — if you change one, change both. Uses a neutral discipline (white-contrast layering, hairline borders, tight radius/button uniformity) adapted to PanaBarbero's single barber-pole-red accent and mobile-first reality.

**The one-line system:** pure neutral surfaces layered by white contrast (in both themes), one red accent that only marks primary actions and active state, hairline borders instead of shadows, radii 6/8/12/16, Geist for everything.

---

## 1. Color

All colors are OKLCH. Neutrals carry **zero chroma** — never blue-tinted or warm-tinted grays. Red is the only brand hue; semantic colors (success, warning, info, destructive) exist for state, not decoration.

### 1.1 White contrast, persisted in dark mode

- **Light:** the canvas is pure white; structure comes from `#e5e5e5`-grade hairlines and a `#fafafa` secondary layer. Ink is near-black neutral.
- **Dark:** the same layering inverted — near-black canvas, surfaces elevated with *white at low alpha* (borders `white/12`, hovers `white/8`), text near-white. Dark mode is not a new palette; it is the same white-contrast system with the lights off.
- The `contrast` pair is the literal embodiment: an ink-black button in light becomes a **white button** in dark. Use it for structural emphasis (marketing CTAs, key confirmations that aren't brand moments).

### 1.2 Core tokens (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | App canvas |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Body text, icons |
| `--card` / `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Elevated surfaces |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Quiet fills, hovers, skeletons |
| `--muted-foreground` | `oklch(0.485 0 0)` | `oklch(0.708 0 0)` | Secondary text (AA on all surfaces) |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Hover/selected fills |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 12%)` | Hairlines everywhere |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Form control borders |
| `--ring` | `oklch(0.556 0 0)` | `oklch(0.556 0 0)` | Focus rings |
| `--primary` | `oklch(0.5156 0.1651 28.33)` | same | Barber-pole red. Primary actions, active nav, brand moments |
| `--primary-foreground` | `oklch(0.971 0.013 17.38)` | same | Text on red |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Neutral secondary buttons/chips |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | |
| `--contrast` | `oklch(0.145 0 0)` | `oklch(1 0 0)` | Ink button ↔ white button |
| `--contrast-foreground` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | |

Sidebar layer (the dashboard **canvas** — the content sheet floats on it):

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-accent` (hover/active fill) | `oklch(0.94 0 0)` | `oklch(0.269 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--sidebar-primary` | `oklch(0.5156 0.1651 28.33)` (= `--primary`) | `oklch(0.7 0.1651 28.33)` (lighter than `--primary` — the raw brand red only holds 2.5:1 on `--sidebar-accent` in dark mode; this variant holds ~5.3:1) |

In the dashboard, elevation reads canvas → sheet in **both** themes: light `#fafafa` canvas / white `--card` sheet; dark `0.145` canvas / `0.205` sheet. The lighter layer always holds the content — that is the persisted white contrast.

Semantic state tokens (`--success`, `--warning`, `--info`, `--destructive` and their foregrounds) are unchanged from before this system and keep their current values; they appear only as badges, alerts, and soft-fill buttons — never as page structure.

### 1.3 Rules

- Red budget: at most **one red-filled element per view region** (the primary action). Red also marks the active nav item (text/icon, not a filled pill). Everything else is neutral.
- Muted text is `--muted-foreground` or darker — never lighten grays "for elegance"; verify ≥4 5:1 (the light value holds 5.9:1 on white, the dark value 6.9:1 on `--card`).
- Hover states move **one step** in the neutral ramp (white → `0.97`; `0.205` → `0.269`), never jump.
- No gradients, no glassmorphism, no colored shadows.

## 2. Typography

One family: **Geist Variable** (`@fontsource-variable/geist`), applied to `body` via `--font-sans`. Code/mono falls back to the system mono stack — don't add a second display face.

Fixed rem scale (product register — no fluid type in app UI):

| Step | Size / line | Weight | Use |
|---|---|---|---|
| `text-xs` | 12 / 16 | 400–500 | Timestamps, table meta, badge text |
| `text-sm` | 14 / 20 | 400 | **Dashboard default**: body, tables, inputs, buttons (500) |
| `text-base` | 16 / 24 | 400 | Marketing body, drawer titles |
| `text-lg` | 18 / 28 | 600 | Card/section titles |
| `text-xl` | 20 / 28 | 600 | Page titles (dashboard `h1`) |
| `text-2xl` | 24 / 32 | 600 | Stat values, dialog heroes |
| `text-3xl`–`text-5xl` | 30–48 | 600–700 | Marketing only |

- Tracking: `tracking-tight` (−0.025em) on ≥20 px headings; never below −0.04em. Body text is never tracked.
- Numbers that align vertically (prices, stock, stats) always get `tabular-nums`.
- `text-balance` on headings, `text-pretty` on descriptions.
- Sentence case everywhere — "Crear cita", not "Crear Cita". No uppercase labels except 2-letter avatar initials.

## 3. Spacing & density

Base unit **4 px**. The working set: 4, 8, 12, 16, 24, 32, 48, 64.

| Context | Value |
|---|---|
| Icon ↔ label inside a control | 6–8 (`gap-1.5` / `gap-2`) |
| Between related controls (toolbar) | 8 (`gap-2`) |
| Card internal padding | 16 (`p-4`) |
| Between cards in a grid | 16 (`gap-4`) |
| Page padding | 16 mobile / 24 desktop (`px-4 md:px-6`) |
| Between page sections | 24–32 (`space-y-6` / `space-y-8`) |
| Dashboard content top/bottom | 24 (`py-6`) |

Density rule: dashboards run at `text-sm` with 16-px paddings — denser than marketing, never cramped. If two adjacent elements have no visible gap or border between them, one of them is wrong.

## 4. Radius

`--radius: 0.5rem` (8 px). Everything derives from it:

| Element | Class | Px |
|---|---|---|
| Inputs, selects, menu items | `rounded-md` | 6 |
| Buttons (all sizes ≥ sm), tabs, nav items | `rounded-lg` | 8 |
| Cards, tables, calendars, alerts | `rounded-xl` | 12 |
| Dialogs, drawers, large media | `rounded-2xl` | 16 |
| Badges, pills, avatars | `rounded-full` | ∞ |

Never invent an in-between radius; never exceed 16 px on a container.

## 5. Borders & elevation

- **Borders are the structure.** `1px solid var(--border)` is the default separator for cards, tables, headers, sidebars. Prefer a border over a shadow; prefer one border over two (no nested outlined boxes).
- Shadows are reserved for **overlays only**: popovers/menus `shadow-md`, dialogs/drawers `shadow-lg`. Cards get **no shadow** (`shadow-xs` is tolerated on interactive form controls like `outline` buttons and inputs,
  nothing larger).
- Never pair a visible border with a wide soft shadow on the same element.
- Elevation ladder: canvas → sidebar (`--sidebar`) → card (`--card`) → overlay (`--popover` + shadow). Two adjacent surfaces must differ by border or by one neutral step, never by shadow alone.

## 6. Buttons

Base: `text-sm font-medium rounded-lg`, icon 16 px (`size-4`), gap 6 px, focus ring `ring-3 ring-ring/50`. Sizes are the whole vocabulary — no one-off heights or paddings:

| Size | Height | Padding-x | Use |
|---|---|---|---|
| `xs` | 24 | 8 | Inline table actions (radius 6) |
| `sm` | 32 | 10 | Toolbars, card footers |
| `default` | 36 | 12 | Standard forms & page actions |
| `lg` | 40 | 16 | Mobile-primary / marketing CTAs |
| `icon-*` | square of the above | — | Always with `aria-label` |

Variants (one visual job each):

- `default` — red fill. The single primary action of a region.
- `contrast` — ink fill, flips to white in dark (see §1.1). Structural emphasis where red would be noise.
- `outline` — white/`--card` bg + `--border`. The workhorse secondary.
- `secondary` — `--secondary` neutral fill. Tertiary, chip-like.
- `ghost` — no fill until hover. Icon buttons, dense rows.
- `destructive` — soft red fill (`bg-destructive/10` + red text). Dangerous actions; confirm via dialog before executing.
- `link` — red text, underline on hover.

A view region gets **one** `default`; pair it with `outline`/`ghost`, never with a second fill.

## 7. Components

- **Inputs**: h-36, `rounded-md`, `border-input`, `text-sm`, white bg (light) / `input/30` (dark). Labels `text-sm font-medium` above; errors `text-destructive text-sm` below. Never a bare placeholder as label.
- **Cards**: `bg-card border border-border rounded-xl`, internal `p-4`, title `text-lg font-semibold`, description `text-sm text-muted-foreground`. Footer = `border-t bg-muted/50` strip for actions. Cards are for grouped content with identity — not for wrapping every list.
- **Stat tile**: label `text-sm text-muted-foreground` over value `text-2xl font-semibold tabular-nums`. Optional state color on the value only. Grid `grid-cols-2 lg:grid-cols-4 gap-4`.
- **Tables**: text left-aligned, numbers right-aligned with `tabular-nums`, actions column right. Header `text-muted-foreground text-sm font-medium h-10`, rows h-48–56, `border-b border-border` separators inside a `rounded-xl border` frame. On mobile, tables either collapse columns (keep: name + state + action) or become list cards — horizontal scroll is a last resort and must keep the first column sticky.
- **Tabs (in-page)**: underline style for page sections, pill (`bg-muted`) style for filters. Persist the active tab in the URL (`search.tab`).
- **Badges**: h-20, `rounded-full px-2 text-xs font-medium`. Soft fills (`/10` bg + colored text) for states: `success`=activo/en stock, `warning`=bajo stock/pendiente, `destructive`=cancelado/agotado, `secondary`=neutral meta (roles, counts).
- **Empty states**: icon (muted) + one sentence of what this place is + the primary action to fill it. Never "No hay resultados." alone when the user can act.
- **Loading**: skeletons that mirror the final layout (never centered spinners inside content); buttons show inline spinner + keep their label.
- **Dialog vs Drawer (responsive modal)**: the same flow renders as a centered dialog ≥ md and a bottom drawer < md, with safe-area padding. Destructive confirms are always `AlertDialog`, two buttons max.

## 8. App shells

Two shells share the tokens above. The dashboard is an **app frame**; the rest of the site is a **page with a header**.

### 8.1 Site shell (marketing, discovery, customer surfaces)

- **Desktop**: the existing top navbar (brand left, links center, utilities right) on `bg-background/95` + blur, `border-b`.
- **Mobile**: slim top bar, h-56: brand left; right side = the **one most important destination for the persona** (customer → Barberías; member → Panel) as a compact button, then notifications and avatar, then a menu button that opens a **right-side drawer** with every remaining link, grouped and labeled, plus theme control. Targets ≥ 44 px.
- **There is no bottom tab bar.** All personas navigate through the top bar + drawer. Content no longer reserves bottom padding.

### 8.2 Dashboard shell (`/profile/barbershops/*` — owners, barbers, staff)

SaaS frame: **inset layout** — the whole viewport is the `--sidebar` canvas; the sidebar sits directly on it and the work area is a raised `bg-card` sheet (`rounded-xl border border-border`, 8-px gutter, own sticky header). Nothing from the site shell renders here.

- **Sidebar** (transparent on the canvas, 16 rem; icon-collapse on desktop; offcanvas drawer on mobile):
  - Header: shop identity — logo/initial, shop name (truncated), plan badge.
  - Groups (role-filtered, in this order):
    - **Operación**: Citas, Servicios, Inventario
    - **Barbería**: Equipo, Ajustes
    - **Asistente**: Pana (chat)
  - Footer: user block (avatar, name, email) opening account menu (Perfil, theme, Cerrar sesión).
  - Items: h-36, `rounded-lg`, icon 16 + `text-sm font-medium`. States are layered, never color-only: **hover** = subtle `bg-sidebar-accent/60` fill, regular weight, outline icon; **active** = solid `bg-sidebar-accent` fill + a 2-px `bg-sidebar-primary` left indicator bar + bold text + filled icon + `--sidebar-primary` icon/text color (a lightness-tuned red, distinct from `--primary`, kept ≥4.5:1 on `--sidebar-accent` in dark mode — see §1.2/§13).
  - Role visibility: owner = all; staff = Citas, Servicios, Inventario,
    Equipo; barber = Citas, Inventario.
- **Sheet header** (h-56, `border-b`, sticky top of the sheet): sidebar trigger, breadcrumb trail (Panel › current section, each route opts in via `staticData.breadcrumb`), right side: notifications + avatar (mobile only — desktop identity lives in the sidebar footer). Page-level primary action stays in the page header, not the shell header.
- **Content**: `max-w-6xl mx-auto w-full px-4 md:px-6 py-6 space-y-6` inside the sheet. Page anatomy: title row (`h1 text-xl` + description + primary action right) → stat row (if any) → work surface (table/calendar/grid). No BorderContainer here — the shell owns the frame. Below `md` the gutter collapses and the sheet goes edge-to-edge (no border/radius).

## 9. Navigation & modal-vs-page

Decision rule for any action:

1. **≤ 6 fields, one step, frequent** → responsive modal (dialog/drawer). Stay in context; the list refreshes behind it.
2. **> 6 fields, multi-section, or needs its own URL** → dedicated page route under the section.
3. **Read-only detail** → popover/drawer if glanceable, page if shareable.
4. **Destructive** → `AlertDialog` confirm, always.

Applied to today's surface:

| Action | Verdict |
|---|---|
| Crear/editar cita | Modal (frequent, few fields) |
| Aceptar/rechazar reagendamiento | Inline row actions + confirm |
| Crear/editar servicio | Modal |
| Insumos de servicio | Modal (single list) |
| Crear/editar producto de inventario | Modal today — becomes a page if the form grows past its current field count |
| Ajustar stock / historial | Modal (adjust) / drawer (history) |
| Invitar miembro | Modal (email + rol) |
| Horario de barbero | Modal (single matrix) |
| Ajustes de barbería | Page sections (already routed) |

Minimize hops: an action never opens a modal from a modal; a page never requires returning "up" to see its effect.

## 10. Motion

- Durations: 150 ms (hover/fade), 200–250 ms (overlay enter, view transitions), never > 400 ms. Easing `ease-out` family; no bounce.
- **View transitions**: dashboard navigations crossfade content (`main-content` name); the sidebar and shell header persist (no name — they don't animate). Chat keeps its slide types. Marketing links may use slide-left/right where direction is meaningful.
- Motion signals state (enter/exit/reorder/feedback) — no decorative choreography, no page-load orchestration.
- Everything respects `prefers-reduced-motion` (global collapse already wired); haptics (`useWebHaptics`) accompany success/error and primary taps.

## 11. Iconography & assets

Phosphor icons, `weight="bold"` via root `IconContext`, `fill` for active nav states. Sizes: 16 in buttons/inputs/nav, 20 in list leads, 24 only in empty states/feature spots. Icons never appear without a text label except in `icon-*` buttons with `aria-label`.

## 12. Voice (es-CO)

Plain, fast, concrete. Verbs first on actions ("Crear cita", "Invitar", "Guardar"), state nouns on feedback ("Cita creada"). No jargon, no filler ("¡Genial!"), no usted-formality theater — direct `tú`. Errors say what happened + what to do next. Empty states teach ("Cuando agregues un
servicio, podrás verlo aquí.").

## 13. Accessibility

WCAG 2.2 AA. The non-negotiables: 4.5:1 body text (verified for every pair in §1.2), 3:1 UI borders on controls, visible focus (`ring-3 ring-ring/50`) on everything interactive, 44-px touch targets on mobile, `aria-current` on active nav, labels on icon buttons, `tabular-nums` for screen-reader-stable numbers, and reduced-motion parity for every animation. Interactive states never rely on color alone (SC 1.4.1): sidebar nav layers fill strength + font weight + icon style + a left indicator bar on top of the color change (see §8.2), and any brand-red-on-dark-fill pairing gets its own lightness-tuned token rather than reusing `--primary` verbatim, to keep text contrast ≥4.5:1.

## 14. Anti-patterns (hard bans)

Everything in `PRODUCT.md` §Anti-references, plus:

- Blue-tinted or warm-tinted grays (chroma > 0 on a neutral token).
- A second filled-color button in the same region as a red one.
- Border + wide soft shadow on the same element; shadows on cards.
- Radius outside the §4 table (no 20/24/32-px containers).
- Bottom tab bars; horizontal-scroll tables without a sticky lead column.
- Center-aligned table text columns.
- Modals that open modals; forms in dialogs without a mobile drawer variant.
- Light-gray-on-white "elegant" text below AA.
- Dropping the page title or the primary CTA on mobile instead of adapting them (collapse the CTA to icon + label priority, never remove it).
