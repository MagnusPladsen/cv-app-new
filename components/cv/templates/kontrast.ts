import type { Template } from '@/components/cv/types'

/**
 * Kontrast - two-tone. A solid accent sidebar with inverted text, against a
 * plain white main column. The strongest colour statement in the gallery, but
 * the reading column stays black on white.
 */
export const kontrast: Template = {
  id: 'kontrast',
  name: 'Kontrast',
  shell: 'sidebar-left',
  defaultAccent: '#1e293b',
  swatches: ['#1e293b', '#0f766e', '#312e81', '#7f1d1d', '#134e4a', '#4a044e'],
  defaultFontPairId: 'inter',
  tags: ['modern', 'professional'],
  levelDisplay: 'bar',
  sidebarSections: ['skills', 'languages', 'interests', 'drivingLicence'],
  tokens: {
    rule: '#d5dae2',
  },
}
