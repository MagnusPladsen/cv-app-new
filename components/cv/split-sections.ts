import type { Section, SectionType } from '@/lib/schema/cv'

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
 */
export function splitSections(
  sections: Section[],
  sidebarSections: SectionType[] | undefined,
): SplitSections {
  const inSidebar = new Set(sidebarSections ?? [])
  const enabled = sections.filter((section) => section.enabled)

  return {
    main: enabled.filter((section) => !inSidebar.has(section.type)),
    sidebar: enabled.filter((section) => inSidebar.has(section.type)),
  }
}
