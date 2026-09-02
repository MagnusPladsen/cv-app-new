import type { Template } from '@/components/cv/types'

/**
 * Oslo - the strict ATS template. Near-black ink, accent used only on rules and
 * headings, and skill levels rendered as words: a proficiency bar means nothing
 * to a resume parser.
 */
export const oslo: Template = {
  id: 'oslo',
  name: 'Oslo',
  shell: 'single',
  defaultAccent: '#1f2933',
  swatches: ['#1f2933', '#2563eb', '#0f766e', '#b45309', '#7c2d12', '#4c1d95'],
  levelDisplay: 'text',
  tokens: {
    rule: '#c9ced6',
  },
}
