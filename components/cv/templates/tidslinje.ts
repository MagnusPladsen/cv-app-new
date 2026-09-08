import type { Template } from '@/components/cv/types'

/**
 * Tidslinje - one column with a rail down the left of every entry, dotted at
 * each role. Career progression reads as a line rather than as a list.
 */
export const tidslinje: Template = {
  id: 'tidslinje',
  name: 'Tidslinje',
  shell: 'single',
  defaultAccent: '#15803d',
  swatches: ['#15803d', '#0f766e', '#1d4ed8', '#b45309', '#9f1239', '#3f3f46'],
  defaultFontPairId: 'lato',
  tags: ['modern', 'one-column'],
  levelDisplay: 'bar',
  tokens: {
    rule: '#dfe4e9',
  },
}
