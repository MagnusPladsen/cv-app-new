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
    document.sections.push(leftoverSection(document, leftovers))
  }

  return document
}

function leftoverSection(document: CvDocument, bullets: string[]): Section {
  return {
    id: nextId(),
    type: 'custom',
    enabled: true,
    title: document.language === 'en' ? 'From the old CV' : 'Fra den gamle CV-en',
    shape: 'bullets',
    bullets,
  }
}

const blank = (value: string | undefined) => !value?.trim()

/** An entry the editor added for typing into, with nothing typed yet. */
const untouched = (entry: { role: string; organisation: string; description?: string }) =>
  blank(entry.role) && blank(entry.organisation) && blank(entry.description)

/**
 * Adds an import to a CV somebody is already writing.
 *
 * Nothing already there is changed: a field is filled only while it is empty,
 * and jobs, degrees and list items are added after the ones present. The
 * empty rows the editor puts in a section to type into are replaced rather
 * than kept above the imported ones. Sections that gain something are
 * switched on.
 *
 * Written to run inside an immer recipe, so the whole import is one step on
 * the undo stack.
 */
export function mergeParse(document: CvDocument, parsed: ParsedCv, choice: ImportChoice): void {
  if (choice.personalia) {
    const personalia = document.personalia
    const found = parsed.personalia
    if (blank(personalia.firstName) && blank(personalia.lastName)) {
      personalia.firstName = found.firstName
      personalia.lastName = found.lastName
    }
    if (blank(personalia.title)) personalia.title = found.title
    if (blank(personalia.email)) personalia.email = found.email
    if (blank(personalia.phone)) personalia.phone = found.phone

    const known = new Set(personalia.links.map((link) => link.url.replace(/^https?:\/\//, '')))
    for (const url of found.links) {
      if (personalia.links.length >= 4) break
      const bare = url.replace(/^https?:\/\//, '')
      if (known.has(bare)) continue
      known.add(bare)
      personalia.links.push({
        id: nextId(),
        label: bare.replace(/^www\./, ''),
        url: url.startsWith('http') ? url : `https://${url}`,
      })
    }
  }

  const listed = (existing: string[], incoming: string[]) => {
    const seen = new Set(existing.map((name) => name.trim().toLowerCase()))
    return incoming.filter((name) => {
      const key = name.trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Only the first section of each kind receives anything.
  const done = new Set<string>()

  for (const section of document.sections) {
    if (done.has(section.type)) continue
    done.add(section.type)

    switch (section.type) {
      case 'summary':
        if (choice.summary && parsed.summary && blank(section.text)) {
          section.text = parsed.summary
          section.enabled = true
        }
        break

      case 'experience':
      case 'education': {
        const incoming = parsed[section.type]
        if (!choice[section.type] || incoming.length === 0) break
        section.entries = [
          ...section.entries.filter((entry) => !untouched(entry)),
          ...toEntries(incoming),
        ]
        section.enabled = true
        break
      }

      case 'skills':
      case 'languages': {
        if (!choice[section.type]) break
        const kept = section.items.filter((item) => !blank(item.name))
        const added = listed(
          kept.map((item) => item.name),
          parsed[section.type],
        )
        if (added.length === 0) break
        section.items = [...kept, ...added.map((name) => ({ id: nextId(), name }))]
        section.enabled = true
        break
      }

      case 'interests': {
        if (!choice.interests) break
        const kept = section.items.filter((item) => !blank(item))
        const added = listed(kept, parsed.interests)
        if (added.length === 0) break
        section.items = [...kept, ...added]
        section.enabled = true
        break
      }
    }
  }

  const leftovers = choice.unrecognised ? parsed.unrecognised.filter(Boolean) : []
  if (leftovers.length > 0) document.sections.push(leftoverSection(document, leftovers))
}
