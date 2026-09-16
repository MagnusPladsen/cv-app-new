import type { PaperId } from '@/lib/schema/cv'

/**
 * Stylesheets that define CV rendering, loaded identically by the on-screen
 * preview and by the print iframe. Order matters: faces, then base rules, then
 * the active template's own sheet.
 *
 * These are plain CSS files in `public/` rather than Tailwind or CSS modules,
 * because the print iframe is a separate document that cannot see the app's
 * bundled styles.
 */
export const CV_STYLESHEETS = ['/cv/fonts.css', '/cv/base.css', '/cv/letter.css'] as const

/**
 * A template's own stylesheet. Every registered template has one, even when it
 * is empty, so the contract is uniform and the export path never has to ask
 * whether a sheet exists.
 */
export function templateStylesheet(templateId: string): string {
  return `/cv/templates/${templateId}.css`
}

/**
 * Page setup for the export: `@page` size and margins, and a white ground.
 *
 * A file rather than an inline <style> in the generated document, because the
 * production CSP is `style-src 'self'` and dropped the inline block - which
 * took the page size and margins with it, in production only, with no error a
 * user would ever see.
 */
export function printStylesheet(paper: PaperId): string {
  return `/cv/print-${paper}.css`
}
