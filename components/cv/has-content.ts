import type { Section } from '@/lib/schema/cv'

const filled = (value: string | undefined): boolean => (value ?? '').trim().length > 0

/**
 * Whether a section would put anything on the page.
 *
 * A switched-on section with nothing in it used to render its heading and then
 * a blank space — so a CV with the default sections enabled and no content yet
 * printed as a name over four empty headings, which reads as a broken export
 * rather than an empty CV. Switching a section on also seeds an empty first
 * row, so this is the normal state of a new document, not an edge case.
 *
 * Emptiness is judged the way the renderers judge it: they already trim and
 * drop blank rows, so a section of nothing but blank rows renders nothing.
 * This is the same rule, applied one level up.
 *
 * Deliberately not the same thing as `enabled`. A section stays switched on in
 * the editor while it is empty — that is where you go to fill it in.
 */
export function hasContent(section: Section): boolean {
  switch (section.type) {
    case 'summary':
      return filled(section.text)

    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteering':
    case 'courses':
      // A date alone is not an entry. Something has to name what it was.
      return section.entries.some((entry) => filled(entry.role) || filled(entry.organisation))

    case 'skills':
    case 'languages':
      return section.items.some((item) => filled(item.name))

    case 'certifications':
      return section.entries.some((entry) => filled(entry.name) || filled(entry.issuer))

    case 'references':
      return section.entries.some(
        (entry) => filled(entry.name) || filled(entry.organisation) || filled(entry.email),
      )

    case 'interests':
      return section.items.some(filled)

    case 'drivingLicence':
      return section.classes.some(filled) || filled(section.note)

    case 'custom':
      if (section.shape === 'text') return filled(section.text)
      if (section.shape === 'bullets') return (section.bullets ?? []).some(filled)
      return (section.entries ?? []).some(
        (entry) => filled(entry.role) || filled(entry.organisation),
      )
  }
}
