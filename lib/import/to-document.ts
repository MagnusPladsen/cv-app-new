import type { CreateDocumentInput } from '@/lib/schema/defaults'
import { createEmptyDocument } from '@/lib/schema/defaults'
import type { CvDocument, Section } from '@/lib/schema/cv'
import { isImportPile } from './pile'
import type { ParsedCv, ParsedEntry } from './parse-cv'

/** Which parts of a parse the person accepted. */
export type ImportChoice = {
  personalia: boolean
  summary: boolean
  experience: boolean
  education: boolean
  skills: boolean
  languages: boolean
  certifications: boolean
  courses: boolean
  projects: boolean
  volunteering: boolean
  references: boolean
  drivingLicence: boolean
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
  certifications: true,
  courses: true,
  projects: true,
  volunteering: true,
  references: true,
  drivingLicence: true,
  interests: true,
  unrecognised: true,
}


/**
 * A readable name for a link. "linkedin.com/in/ingridbh" tells a reader
 * nothing they cannot see from the word LinkedIn, and a CV that prints the
 * whole path spends a line on it.
 */
const SITES: [RegExp, string][] = [
  [/(^|\.)linkedin\.com/i, 'LinkedIn'],
  [/(^|\.)github\.com/i, 'GitHub'],
  [/(^|\.)gitlab\.com/i, 'GitLab'],
  [/(^|\.)behance\.net/i, 'Behance'],
  [/(^|\.)dribbble\.com/i, 'Dribbble'],
  [/(^|\.)medium\.com/i, 'Medium'],
  [/(^|\.)stackoverflow\.com/i, 'Stack Overflow'],
  [/(^|\.)x\.com|(^|\.)twitter\.com/i, 'X'],
  [/(^|\.)instagram\.com/i, 'Instagram'],
  [/(^|\.)facebook\.com/i, 'Facebook'],
  [/(^|\.)youtube\.com/i, 'YouTube'],
]

function toLink(url: string, id: string) {
  const bare = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
  const host = bare.split('/')[0] ?? bare
  const site = SITES.find(([pattern]) => pattern.test(host))
  return {
    id,
    // A personal domain keeps its name - "ingrid.dev" is the point of having
    // one - and only the path is dropped.
    label: site ? site[1] : host,
    url: url.startsWith('http') ? url : `https://${url}`,
  }
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
      city: parsed.personalia.city,
      country: parsed.personalia.country,
      links: parsed.personalia.links.slice(0, 4).map((url) => toLink(url, nextId())),
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

      case 'courses':
      case 'projects':
      case 'volunteering':
        return choice[section.type] && parsed[section.type].length > 0
          ? { ...section, enabled: true, entries: toEntries(parsed[section.type]) }
          : { ...section, enabled: false }

      case 'certifications':
        return choice.certifications && parsed.certifications.length > 0
          ? {
              ...section,
              enabled: true,
              entries: parsed.certifications.map((certification) => ({
                id: nextId(),
                ...certification,
              })),
            }
          : { ...section, enabled: false }

      case 'references':
        return choice.references && parsed.references.length > 0
          ? {
              ...section,
              enabled: true,
              entries: parsed.references.map((reference) => ({ id: nextId(), ...reference })),
            }
          : { ...section, enabled: false }

      case 'drivingLicence':
        return choice.drivingLicence && parsed.drivingLicence.length > 0
          ? { ...section, enabled: true, classes: parsed.drivingLicence }
          : { ...section, enabled: false }

      case 'skills':
        return choice.skills && parsed.skills.length > 0
          ? {
              ...section,
              enabled: true,
              items: parsed.skills.map((skill) => ({ id: nextId(), ...skill })),
            }
          : { ...section, enabled: false }

      case 'languages':
        return choice.languages && parsed.languages.length > 0
          ? {
              ...section,
              enabled: true,
              items: parsed.languages.map((language) => ({ id: nextId(), ...language })),
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

/**
 * The lines an import could not place. Named as a job still to do, because it
 * prints on the CV like any other section until somebody deletes it.
 */
function leftoverSection(document: CvDocument, bullets: string[]): Section {
  return {
    id: nextId(),
    type: 'custom',
    enabled: true,
    imported: true,
    title: document.language === 'en' ? 'To sort: text from the import' : 'Å sortere: tekst fra importen',
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
    if (blank(personalia.city)) personalia.city = found.city
    if (blank(personalia.country)) personalia.country = found.country

    const known = new Set(personalia.links.map((link) => link.url.replace(/^https?:\/\//, '')))
    for (const url of found.links) {
      if (personalia.links.length >= 4) break
      const bare = url.replace(/^https?:\/\//, '')
      if (known.has(bare)) continue
      known.add(bare)
      personalia.links.push(toLink(url, nextId()))
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
      case 'education':
      case 'courses':
      case 'projects':
      case 'volunteering': {
        const incoming = parsed[section.type]
        if (!choice[section.type] || incoming.length === 0) break
        section.entries = [
          ...section.entries.filter((entry) => !untouched(entry)),
          ...toEntries(incoming),
        ]
        section.enabled = true
        break
      }

      case 'certifications': {
        if (!choice.certifications || parsed.certifications.length === 0) break
        section.entries = [
          ...section.entries.filter((entry) => !blank(entry.name)),
          ...parsed.certifications.map((certification) => ({ id: nextId(), ...certification })),
        ]
        section.enabled = true
        break
      }

      case 'references': {
        if (!choice.references || parsed.references.length === 0) break
        section.entries = [
          ...section.entries.filter((entry) => !blank(entry.name)),
          ...parsed.references.map((reference) => ({ id: nextId(), ...reference })),
        ]
        section.enabled = true
        break
      }

      case 'drivingLicence': {
        if (!choice.drivingLicence || parsed.drivingLicence.length === 0) break
        section.classes = [...new Set([...section.classes, ...parsed.drivingLicence])]
        section.enabled = true
        break
      }

      case 'skills': {
        if (!choice.skills) break
        const kept = section.items.filter((item) => !blank(item.name))
        const known = new Set(kept.map((item) => item.name.trim().toLowerCase()))
        const added = parsed.skills.filter((skill) => !known.has(skill.name.trim().toLowerCase()))
        if (added.length === 0) break
        section.items = [...kept, ...added.map((skill) => ({ id: nextId(), ...skill }))]
        section.enabled = true
        break
      }

      case 'languages': {
        if (!choice.languages) break
        const kept = section.items.filter((item) => !blank(item.name))
        const known = new Set(kept.map((item) => item.name.trim().toLowerCase()))
        const added = parsed.languages.filter(
          (language) => !known.has(language.name.trim().toLowerCase()),
        )
        if (added.length === 0) break
        section.items = [...kept, ...added.map((language) => ({ id: nextId(), ...language }))]
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
  if (leftovers.length === 0) return
  // A second import adds to the pile already waiting, rather than starting
  // another one.
  const waiting = document.sections.find(isImportPile)
  if (waiting?.type === 'custom') {
    waiting.bullets = [...(waiting.bullets ?? []), ...leftovers]
    waiting.enabled = true
  } else {
    document.sections.push(leftoverSection(document, leftovers))
  }
}
