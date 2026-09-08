import type { Template } from '@/components/cv/types'

/**
 * Fjord - a full-height coloured column carrying the portrait, contact details
 * and the short, scannable sections, with the narrative down the main column.
 * The most recognisable "premium template" shape.
 */
export const fjord: Template = {
  id: 'fjord',
  name: 'Fjord',
  shell: 'sidebar-full',
  defaultAccent: '#0e7490',
  swatches: ['#0e7490', '#155e75', '#166534', '#7c2d12', '#3730a3', '#1f2933'],
  defaultFontPairId: 'garamond-lato',
  tags: ['professional', 'modern'],
  levelDisplay: 'bar',
  sidebarSections: ['skills', 'languages', 'interests', 'drivingLicence'],
}
