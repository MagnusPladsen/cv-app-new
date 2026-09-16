import type { CreateDocumentInput } from '@/lib/schema/defaults'
import { createEmptyDocument } from '@/lib/schema/defaults'
import type { CvDocument, Section } from '@/lib/schema/cv'
import type { ParsedCv, ParsedEntry } from './parse-cv'

/** Which parts of a parse the person accepted. */
export type ImportChoice = {
  personalia: boolean
  summary: boolean
  experience: boolean
  education: boolean
  skills: boolean
  languages: boolean
  interests: boolean
  /** Keep what could not be placed, in a section of its own. */
  unrecognised: boolean
}

export const ACCEPT_ALL: ImportChoice = {
  personalia: true,
  summary: true,
  experience: true,
  education: true,
  skills: true,
  languages: true,
  interests: true,
  unrecognised: true,
}

let sequence = 0
const nextId = () => `imported-${Date.now().toString(36)}-${(sequence += 1)}`

function toEntries(parsed: ParsedEntry[]) {
  return parsed.map((entry) => ({
    id: nextId(),
    role: entry.role,
    organisation: entry.organisation,
    location: '',
    from: entry.from,
    to: entry.to,
    current: entry.current,
    description: entry.bullets.join('\n'),
    descriptionMode: 'bullets' as const,
  }))
}

/**
 * Builds a CV from what the person chose to keep.
 *
 * A new document every time, never an edit of an existing one: an import that
 * can overwrite is an import somebody has to be careful with, and nobody reads
 * carefully before clicking a file picker.
 *
 * A section the parse found nothing for is left switched off rather than
 * switched on and empty, so the CV that opens is the CV that was imported.
 */
export function documentFromParse(
  parsed: ParsedCv,
  choice: ImportChoice,
  input: CreateDocumentInput = {},
): CvDocument {
  const document = createEmptyDocument(input)

  if (choice.personalia) {
    document.personalia = {
      ...document.personalia,
      firstName: parsed.personalia.firstName,
      lastName: parsed.personalia.lastName,
      title: parsed.personalia.title,
      email: parsed.personalia.email,
      phone: parsed.personalia.phone,
      links: parsed.personalia.links.slice(0, 4).map((url) => ({
        id: nextId(),
        label: url.replace(/^https?:\/\//, '').replace(/^www\./, ''),
        url: url.startsWith('http') ? url : `https://${url}`,
      })),
    }
  }

  const leftovers = choice.unrecognised ? parsed.unrecognised.filter(Boolean) : []

  document.sections = document.sections.map((section): Section => {
    switch (section.type) {
      case 'summary':
        return choice.summary && parsed.summary
          ? { ...section, enabled: true, text: parsed.summary }
          : { ...section, enabled: false }

      case 'experience':
        return choice.experience && parsed.experience.length > 0
          ? { ...section, enabled: true, entries: toEntries(parsed.experience) }
          : { ...section, enabled: false }

      case 'education':
        return choice.education && parsed.education.length > 0
          ? { ...section, enabled: true, entries: toEntries(parsed.education) }
          : { ...section, enabled: false }

      case 'skills':
        return choice.skills && parsed.skills.length > 0
          ? {
              ...section,
              enabled: true,
              items: parsed.skills.map((name) => ({ id: nextId(), name })),
            }
          : { ...section, enabled: false }

      case 'languages':
        return choice.languages && parsed.languages.length > 0
          ? {
              ...section,
              enabled: true,
              items: parsed.languages.map((name) => ({ id: nextId(), name })),
            }
          : { ...section, enabled: false }

      case 'interests':
        return choice.interests && parsed.interests.length > 0
          ? { ...section, enabled: true, items: parsed.interests }
          : { ...section, enabled: false }

      default:
        return { ...section, enabled: false }
    }
  })

  if (leftovers.length > 0) {
    // Everything the parse could not place, kept verbatim in a section of its
    // own. Dropping it would mean the import quietly lost part of somebody's
    // CV, which is the failure this whole design is arranged to avoid.
    document.sections.push({
      id: nextId(),
      type: 'custom',
      enabled: true,
      title: 'Fra den gamle CV-en',
      shape: 'bullets',
      bullets: leftovers,
    })
  }

  return document
}
