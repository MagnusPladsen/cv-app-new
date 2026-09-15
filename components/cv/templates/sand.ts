import type { Template } from '@/components/cv/types'

/**
 * Sand - a full-height column in a pale tint of the accent.
 *
 * The same shape as the colour-column template, read the other way round.
 * A solid column commits the whole page to one strong colour; a pale one keeps
 * the structure and lets the CV stay quiet, which is what most people
 * applying for most jobs actually want.
 */
export const sand: Template = {
  id: 'sand',
  name: 'Sand',
  shell: 'sidebar-full',
  defaultAccent: '#b45309',
  swatches: ['#b45309', '#0f766e', '#1d4ed8', '#7f1d1d', '#3f6212', '#4c1d95'],
  defaultFontPairId: 'merriweather-lato',
  tags: ['professional', 'simple'],
  levelDisplay: 'bar',
  sidebarSections: ['skills', 'languages', 'interests', 'drivingLicence'],
  tokens: {
    rule: '#e2ddd4',
    muted: '#5f5a52',
  },
}
