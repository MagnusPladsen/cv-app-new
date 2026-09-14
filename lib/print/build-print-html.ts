import type { PaperId } from '@/lib/schema/cv'
import { CV_STYLESHEETS, printStylesheet } from './stylesheets'

const TRANSLITERATIONS: Record<string, string> = {
  æ: 'ae',
  Æ: 'AE',
  ø: 'o',
  Ø: 'O',
  å: 'a',
  Å: 'A',
}

/**
 * Builds the filename the browser suggests in the print dialog.
 * Norwegian letters are transliterated so the name survives every filesystem.
 */
export function buildPrintTitle(firstName: string, lastName: string): string {
  const raw = `${firstName} ${lastName}`
    .replace(/[æÆøØåÅ]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return raw ? `${raw}_CV` : 'CV'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type BuildPrintHtmlOptions = {
  /** outerHTML of the rendered `.cv-doc` node. */
  bodyHtml: string
  title: string
  paper: PaperId
  lang: string
  /** Template-specific stylesheets, loaded after the shared ones. */
  extraStylesheets?: readonly string[]
}

export function buildPrintHtml({
  bodyHtml,
  title,
  paper,
  lang,
  extraStylesheets = [],
}: BuildPrintHtmlOptions): string {
  // The page setup comes last, as a file: an inline <style> here was silently
  // dropped in production, where the CSP is `style-src 'self'`.
  const stylesheets = [...CV_STYLESHEETS, ...extraStylesheets, printStylesheet(paper)]
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join('\n    ')

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    ${stylesheets}
  </head>
  <body>${bodyHtml}</body>
</html>`
}
