/**
 * Stylesheets that define CV rendering, loaded identically by the on-screen
 * preview and by the print iframe. Order matters: faces before rules.
 *
 * These are plain CSS files in `public/` rather than Tailwind or CSS modules,
 * because the print iframe is a separate document that cannot see the app's
 * bundled styles.
 */
export const CV_STYLESHEETS = ['/cv/fonts.css', '/cv/base.css'] as const
