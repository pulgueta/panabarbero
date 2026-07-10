/**
 * Shared horizontal gutter for the dashboard sheet.
 *
 * The topbar and the page content both use this so their left/right edges line
 * up at every breakpoint, and the content reads full-width edge-to-edge inside
 * the inset sheet (no centered `max-w` column). The value mirrors the
 * sidebar-icon inset rhythm: 16px on mobile, 24px from `md` up.
 */
export const DASHBOARD_GUTTER_X = "px-4 md:px-6";
