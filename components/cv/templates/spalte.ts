import type { Template } from '@/components/cv/types'

/**
 * Spalte - a tinted panel down the right, in Inter.
 *
 * The gallery had one right-sidebar template and it was the plain ATS one.
 * This is the other reading of the same shape: the column is a surface rather
 * than a margin, so skills and languages read as a summary beside the history
 * instead of a footnote after it.
 */
export const spalte: Template = {
  id: 'spalte',
  name: 'Spalte',
  shell: 'sidebar-right',
  defaultAccent: '#0f766e',
  swatches: ['#0f766e', '#1d4ed8', '#7c2d12', '#4338ca', '#0e7490', '#166534'],
  defaultFontPairId: 'inter',
  tags: ['modern', 'professional'],
  levelDisplay: 'bar',
  sidebarSections: ['skills', 'languages', 'interests', 'drivingLicence'],
  tokens: {
    rule: '#dfe3e8',
    muted: '#5b6472',
  },
}
