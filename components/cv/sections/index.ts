import type { ReactNode } from 'react'
import type { Section, SectionType } from '@/lib/schema/cv'
import type { RenderContext, SectionRenderer } from '@/components/cv/types'
import { SECTION_RENDERERS, sectionTitle } from './renderers'

export { SECTION_RENDERERS, sectionTitle }
export { Description, toBullets } from './Description'
export { LevelBar } from './LevelBar'
export { SectionFrame } from './SectionFrame'

export function renderSection(
  section: Section,
  context: RenderContext,
  overrides?: Partial<Record<SectionType, SectionRenderer>>,
): ReactNode {
  const renderer = overrides?.[section.type] ?? SECTION_RENDERERS[section.type]
  return renderer({ section, context })
}
