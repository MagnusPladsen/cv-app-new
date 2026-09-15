import type { Template } from '@/components/cv/types'

/**
 * Raster - Swiss grid: an oversized name, hairline rules, and labels small
 * enough to read as furniture rather than headings.
 *
 * The gallery's modern templates all say "modern" with colour. This one says
 * it with typography and spacing, and uses the accent about four times in the
 * whole document.
 */
export const raster: Template = {
  id: 'raster',
  name: 'Raster',
  shell: 'single',
  defaultAccent: '#dc2626',
  swatches: ['#dc2626', '#111827', '#1d4ed8', '#0f766e', '#c2410c', '#4c1d95'],
  defaultFontPairId: 'inter-tight',
  tags: ['modern', 'creative', 'one-column'],
  levelDisplay: 'text',
  tokens: {
    rule: '#c8ccd2',
    muted: '#6b7280',
  },
}
