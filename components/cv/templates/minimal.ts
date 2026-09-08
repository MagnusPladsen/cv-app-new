import type { Template } from '@/components/cv/types'

/**
 * Minimal - no rules, no bars, no colour beyond the ink. Space does the
 * organising. Nothing here is decoration, which is also what makes it the
 * safest template to put through a CV parser.
 */
export const minimal: Template = {
  id: 'minimal',
  name: 'Minimal',
  shell: 'single',
  defaultAccent: '#111827',
  swatches: ['#111827', '#374151', '#1e3a8a', '#0f766e', '#7f1d1d', '#4c1d95'],
  defaultFontPairId: 'inter',
  tags: ['ats', 'simple', 'one-column'],
  levelDisplay: 'text',
  tokens: {
    rule: '#e5e7eb',
    muted: '#6b7280',
  },
}
