import type { Template } from '@/components/cv/types'

/**
 * Kompakt - dense single column for a long career. Entry headers collapse onto
 * one line, gaps tighten and skills run three across, so fifteen years still
 * fits on one page.
 */
export const kompakt: Template = {
  id: 'kompakt',
  name: 'Kompakt',
  shell: 'single',
  defaultAccent: '#0f766e',
  swatches: ['#0f766e', '#1f2933', '#2563eb', '#b45309', '#9f1239', '#4338ca'],
  levelDisplay: 'text',
  tokens: {
    rule: '#d4d9e0',
  },
}
