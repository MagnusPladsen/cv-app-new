import type { Template } from '@/components/cv/types'

/**
 * Fjord - tinted left sidebar carrying the short, scannable sections, with the
 * narrative down the main column.
 */
export const fjord: Template = {
  id: 'fjord',
  name: 'Fjord',
  shell: 'sidebar-left',
  defaultAccent: '#0e7490',
  swatches: ['#0e7490', '#155e75', '#166534', '#7c2d12', '#3730a3', '#1f2933'],
  levelDisplay: 'bar',
  sidebarSections: ['skills', 'languages', 'interests', 'drivingLicence'],
}
