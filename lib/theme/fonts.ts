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
export const FONT_PAIRS: FontPair[] = [
  {
    id: 'inter',
    name: 'Inter',
    head: "'Inter', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
  },
]

export const DEFAULT_FONT_PAIR_ID = 'inter'

export function getFontPair(id: string): FontPair {
  return (
    FONT_PAIRS.find((pair) => pair.id === id) ??
    FONT_PAIRS.find((pair) => pair.id === DEFAULT_FONT_PAIR_ID)!
  )
}
