import type { Template } from '@/components/cv/types'

/**
 * Akademisk - a serif classic for academic and research CVs, where a long
 * publication list and a formal register matter more than visual novelty.
 */
export const akademisk: Template = {
  id: 'akademisk',
  name: 'Akademisk',
  shell: 'single',
  defaultAccent: '#7f1d1d',
  swatches: ['#7f1d1d', '#1f2933', '#14532d', '#1e3a8a', '#78350f', '#3b0764'],
  defaultFontPairId: 'baskerville',
  levelDisplay: 'text',
  tokens: {
    rule: '#c8c2ba',
    muted: '#5c5750',
  },
}
