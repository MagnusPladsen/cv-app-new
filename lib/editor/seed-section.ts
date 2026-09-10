import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import type { Section } from '@/lib/schema/cv'

/**
 * Gives a freshly opened section its first row to type into.
 *
 * "Om meg" hands you a textarea straight away; every other section handed you
 * a lone "Legg til" button and no fields, so opening Arbeidserfaring looked
 * like there was nowhere to write at all. This makes the rest behave like the
 * one that already worked.
 *
 * An empty row prints nothing on the CV and can be removed, so seeding a
 * section someone only glanced at costs them nothing.
 *
 * Returns whether it added anything, so a caller can tell "nothing to do"
 * from "done".
 */
export function seedSection(section: Section, handlers: DocumentEditorHandlers): boolean {
  switch (section.type) {
    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteering':
    case 'courses':
      if (section.entries.length > 0) return false
      handlers.onAddEntry(section.id)
      return true

    case 'skills':
    case 'languages':
      if (section.items.length > 0) return false
      handlers.onAddItem(section.id)
      return true

    case 'certifications':
      if (section.entries.length > 0) return false
      handlers.onAddCert(section.id)
      return true

    case 'references':
      if (section.entries.length > 0) return false
      handlers.onAddReference(section.id)
      return true

    // summary, interests, drivingLicence and custom already show a field to
    // type into the moment they are opened.
    default:
      return false
  }
}
