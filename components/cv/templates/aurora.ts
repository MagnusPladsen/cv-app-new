import type { Template } from '@/components/cv/types'

/**
 * Aurora - a gradient header band with tight display type. The most visually
 * assertive of the band templates, aimed at design and product roles.
 */
export const aurora: Template = {
  id: 'aurora',
  name: 'Aurora',
  shell: 'header-band',
  defaultAccent: '#4c1d95',
  swatches: ['#4c1d95', '#0f766e', '#be123c', '#1d4ed8', '#c2410c', '#134e4a'],
  defaultFontPairId: 'inter-tight',
  levelDisplay: 'bar',
}
