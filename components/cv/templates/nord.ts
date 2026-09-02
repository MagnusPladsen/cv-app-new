import type { Template } from '@/components/cv/types'

/**
 * Nord - a light right sidebar separated by a hairline. Quiet and symmetrical;
 * the reader's eye starts on the narrative, not the skills.
 *
 * Certifications stay in the main column: their names are long enough to wrap
 * to one word per line in the sidebar.
 */
export const nord: Template = {
  id: 'nord',
  name: 'Nord',
  shell: 'sidebar-right',
  defaultAccent: '#1f2933',
  swatches: ['#1f2933', '#334155', '#0f766e', '#1d4ed8', '#9d174d', '#a16207'],
  levelDisplay: 'text',
  sidebarSections: ['skills', 'languages', 'interests'],
}
