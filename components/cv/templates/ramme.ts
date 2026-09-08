import type { Template } from '@/components/cv/types'

/**
 * Ramme - the header sits in a ruled box and section titles carry a small
 * square marker. Structured and formal without any large areas of colour, so
 * it prints cheaply on an office printer.
 */
export const ramme: Template = {
  id: 'ramme',
  name: 'Ramme',
  shell: 'single',
  defaultAccent: '#9a3412',
  swatches: ['#9a3412', '#1f2933', '#1e3a8a', '#166534', '#6b21a8', '#0f766e'],
  defaultFontPairId: 'merriweather-lato',
  tags: ['professional', 'simple', 'one-column'],
  levelDisplay: 'text',
  tokens: {
    rule: '#c7ccd4',
  },
}
