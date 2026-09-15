import type { Template } from '@/components/cv/types'

/**
 * Register - section names in a left gutter, content in a single measure.
 *
 * The shape public-sector and academic applications in Norway tend to expect,
 * and the one a CV parser reads most reliably: every heading sits on its own
 * axis, nothing is coloured in, and the reading order on the page is the
 * reading order in the markup.
 */
export const register: Template = {
  id: 'register',
  name: 'Register',
  shell: 'single',
  defaultAccent: '#1f2933',
  swatches: ['#1f2933', '#334155', '#1e3a8a', '#0f766e', '#7f1d1d', '#3f3f46'],
  defaultFontPairId: 'georgia-opensans',
  tags: ['ats', 'simple', 'one-column'],
  levelDisplay: 'text',
  tokens: {
    rule: '#d9dee5',
    muted: '#5b6472',
  },
}
