import type { Template } from '@/components/cv/types'

/**
 * Trondheim - a full-bleed accent band across the top carrying the portrait and
 * personalia. Ink inside the band is derived from the accent's contrast, so any
 * colour stays readable.
 */
export const trondheim: Template = {
  id: 'trondheim',
  name: 'Trondheim',
  shell: 'header-band',
  defaultAccent: '#1e3a8a',
  swatches: ['#1e3a8a', '#0f766e', '#7c2d12', '#4c1d95', '#134e4a', '#1f2933'],
  levelDisplay: 'bar',
}
