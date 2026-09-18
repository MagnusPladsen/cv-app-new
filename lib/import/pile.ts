import type { Section } from '@/lib/schema/cv'

/**
 * The titles this section was given before it carried a flag of its own.
 * CVs imported then still hold one, and they are the CVs most in need of the
 * explanation - so they are recognised by name.
 */
const OLD_TITLES = ['fra den gamle cv-en', 'from the old cv']

/** Whether a section holds the lines an import could not place. */
export function isImportPile(section: Section): section is Extract<Section, { type: 'custom' }> {
  if (section.type !== 'custom') return false
  return section.imported === true || OLD_TITLES.includes(section.title.trim().toLowerCase())
}
