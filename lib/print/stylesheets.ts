/**
 * Stylesheets that define CV rendering, loaded identically by the on-screen
 * preview and by the print iframe. Order matters: faces, then base rules, then
 * the active template's own sheet.
 *
 * These are plain CSS files in `public/` rather than Tailwind or CSS modules,
 * because the print iframe is a separate document that cannot see the app's
 * bundled styles.
 */
export const CV_STYLESHEETS = ['/cv/fonts.css', '/cv/base.css'] as const

/**
 * A template's own stylesheet. Every registered template has one, even when it
 * is empty, so the contract is uniform and the export path never has to ask
 * whether a sheet exists.
 */
export function templateStylesheet(templateId: string): string {
  return `/cv/templates/${templateId}.css`
}
