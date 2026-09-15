import type { Section, SectionType } from '@/lib/schema/cv'
import { hasContent } from './has-content'

export type SplitSections = {
  main: Section[]
  sidebar: Section[]
}

/**
 * Splits enabled sections into the main column and the sidebar.
 *
 * A section named in `sidebarSections` goes to the aside and nowhere else, so
 * nothing renders twice. Document order is preserved within each group, so
 * reordering in the editor still reads correctly on the page.
 *
 * Empty sections are dropped here rather than in each renderer, so the main
 * column and the sidebar cannot disagree about it. Switched on and empty is
 * the normal state of a new CV - the editor keeps showing the section, the
 * page does not print a heading with nothing under it.
 */
export function splitSections(
  sections: Section[],
  sidebarSections: SectionType[] | undefined,
): SplitSections {
  const inSidebar = new Set(sidebarSections ?? [])
  const enabled = sections.filter((section) => section.enabled && hasContent(section))

  return {
    main: enabled.filter((section) => !inSidebar.has(section.type)),
    sidebar: enabled.filter((section) => inSidebar.has(section.type)),
  }
}
