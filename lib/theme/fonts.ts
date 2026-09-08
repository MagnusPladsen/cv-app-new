export type FontPair = {
  id: string
  name: string
  /** CSS font stack for headings. */
  head: string
  /** CSS font stack for body copy. */
  body: string
}

const SANS_FALLBACK = 'system-ui, -apple-system, sans-serif'
const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif'

/**
 * The families here are the ones career guidance actually recommends for a CV:
 * Garamond, Georgia, Calibri, Helvetica/Arial, Lato, Open Sans. Two are
 * metric-compatible open clones of fonts most people already know —
 * Carlito for Calibri, Gelasio for Georgia.
 *
 * Every family must be self-hosted with an @font-face rule in
 * `public/cv/fonts.css`: the print iframe is a separate document and cannot see
 * next/font's stylesheet, so an undeclared family silently degrades in the PDF
 * only. A test enforces the pairing-to-face correspondence.
 */
export const FONT_PAIRS: FontPair[] = [
  {
    id: 'garamond-lato',
    name: 'Garamond + Lato',
    head: `'EB Garamond', ${SERIF_FALLBACK}`,
    body: `'Lato', ${SANS_FALLBACK}`,
  },
  {
    id: 'lato',
    name: 'Lato',
    head: `'Lato', ${SANS_FALLBACK}`,
    body: `'Lato', ${SANS_FALLBACK}`,
  },
  {
    id: 'calibri',
    name: 'Calibri',
    head: `'Carlito', 'Calibri', ${SANS_FALLBACK}`,
    body: `'Carlito', 'Calibri', ${SANS_FALLBACK}`,
  },
  {
    id: 'georgia-opensans',
    name: 'Georgia + Open Sans',
    head: `'Gelasio', ${SERIF_FALLBACK}`,
    body: `'Open Sans', ${SANS_FALLBACK}`,
  },
  {
    id: 'opensans',
    name: 'Open Sans',
    head: `'Open Sans', ${SANS_FALLBACK}`,
    body: `'Open Sans', ${SANS_FALLBACK}`,
  },
  {
    id: 'merriweather-lato',
    name: 'Merriweather + Lato',
    head: `'Merriweather', ${SERIF_FALLBACK}`,
    body: `'Lato', ${SANS_FALLBACK}`,
  },
  {
    id: 'garamond',
    name: 'Garamond',
    head: `'EB Garamond', ${SERIF_FALLBACK}`,
    body: `'EB Garamond', ${SERIF_FALLBACK}`,
  },
  {
    id: 'baskerville',
    name: 'Libre Baskerville',
    head: `'Libre Baskerville', ${SERIF_FALLBACK}`,
    body: `'Source Sans 3', ${SANS_FALLBACK}`,
  },
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
]

export const DEFAULT_FONT_PAIR_ID = 'lato'

export function getFontPair(id: string): FontPair {
  return (
    FONT_PAIRS.find((pair) => pair.id === id) ??
    FONT_PAIRS.find((pair) => pair.id === DEFAULT_FONT_PAIR_ID)!
  )
}
