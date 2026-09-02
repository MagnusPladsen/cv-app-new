export type FontPair = {
  id: string
  name: string
  /** CSS font stack for headings. */
  head: string
  /** CSS font stack for body copy. */
  body: string
}

/**
 * Font families available to CV templates. Every family here must be
 * self-hosted with an @font-face rule in `public/cv/fonts.css`, because the
 * print iframe is a separate document and cannot see next/font's stylesheet.
 * More pairings land alongside the templates that need them.
 */
const SANS_FALLBACK = 'system-ui, -apple-system, sans-serif'
const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif'

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'inter',
    name: 'Inter',
    head: `'Inter', ${SANS_FALLBACK}`,
    body: `'Inter', ${SANS_FALLBACK}`,
  },
  {
    id: 'inter-tight',
    name: 'Inter Tight',
    head: `'Inter Tight', ${SANS_FALLBACK}`,
    body: `'Inter', ${SANS_FALLBACK}`,
  },
  {
    id: 'baskerville',
    name: 'Libre Baskerville',
    head: `'Libre Baskerville', ${SERIF_FALLBACK}`,
    body: `'Source Sans 3', ${SANS_FALLBACK}`,
  },
]

export const DEFAULT_FONT_PAIR_ID = 'inter'

export function getFontPair(id: string): FontPair {
  return (
    FONT_PAIRS.find((pair) => pair.id === id) ??
    FONT_PAIRS.find((pair) => pair.id === DEFAULT_FONT_PAIR_ID)!
  )
}
