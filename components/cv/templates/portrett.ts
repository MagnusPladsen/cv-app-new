import type { Template } from '@/components/cv/types'

/**
 * Portrett - photo-led. A large round portrait beside the name, with the
 * accent carried by a single heavy rule under the header. For the sectors that
 * expect a picture; the rest of the page stays quiet.
 */
export const portrett: Template = {
  id: 'portrett',
  name: 'Portrett',
  shell: 'single',
  defaultAccent: '#155e75',
  swatches: ['#155e75', '#1f2933', '#9f1239', '#166534', '#4c1d95', '#b45309'],
  defaultFontPairId: 'baskerville',
  tags: ['professional', 'modern', 'one-column'],
  levelDisplay: 'bar',
  tokens: {
    rule: '#d4dae0',
  },
}
