import type { Template } from '@/components/cv/types'

/**
 * Bergen - modern single column. Section titles sit on an accent rule rather
 * than under one, the name is large and tightly tracked, and the whole page
 * breathes. The default choice for most people.
 */
export const bergen: Template = {
  id: 'bergen',
  name: 'Bergen',
  shell: 'single',
  defaultAccent: '#2563eb',
  swatches: ['#2563eb', '#0f766e', '#7c3aed', '#be123c', '#ea580c', '#1f2933'],
  levelDisplay: 'bar',
}
