import type {
  CertEntry,
  CvDocument,
  LanguageItem,
  ReferenceEntry,
  Section,
  SkillItem,
  TimelineEntry,
} from '@/lib/schema/cv'
import { createEmptySection } from '@/lib/schema/defaults'

export type IdFactory = () => string

export function moveArrayItem<T>(items: T[], from: number, to: number): void {
  if (from === to) return
  if (from < 0 || from >= items.length) return
  if (to < 0 || to >= items.length) return
  const [moved] = items.splice(from, 1)
  if (moved !== undefined) items.splice(to, 0, moved)
}

export function findSection(doc: CvDocument, sectionId: string): Section | undefined {
  return doc.sections.find((section) => section.id === sectionId)
}

/**
 * Sections whose payload is a TimelineEntry[]. A custom section qualifies only
 * in `entries` shape.
 */
function timelineEntriesOf(section: Section | undefined): TimelineEntry[] | undefined {
  if (!section) return undefined
  switch (section.type) {
    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteering':
    case 'courses':
      return section.entries
    case 'custom':
      if (section.shape !== 'entries') return undefined
      section.entries ??= []
      return section.entries
    default:
      return undefined
  }
}

function certEntriesOf(section: Section | undefined): CertEntry[] | undefined {
  return section?.type === 'certifications' ? section.entries : undefined
}

function referenceEntriesOf(section: Section | undefined): ReferenceEntry[] | undefined {
  return section?.type === 'references' ? section.entries : undefined
}

function leveledItemsOf(section: Section | undefined): SkillItem[] | LanguageItem[] | undefined {
  if (section?.type === 'skills') return section.items
  if (section?.type === 'languages') return section.items
  return undefined
}

export function setSectionEnabled(doc: CvDocument, sectionId: string, enabled: boolean): void {
  const section = findSection(doc, sectionId)
  if (section) section.enabled = enabled
}

export function setSectionTitle(doc: CvDocument, sectionId: string, title: string): void {
  const section = findSection(doc, sectionId)
  if (!section) return

  if (section.type === 'custom') {
    section.title = title
    return
  }

  const trimmed = title.trim()
  if (trimmed) section.titleOverride = trimmed
  else delete section.titleOverride
}

export function moveSection(doc: CvDocument, from: number, to: number): void {
  moveArrayItem(doc.sections, from, to)
}

export function addCustomSection(
  doc: CvDocument,
  shape: 'entries' | 'bullets' | 'text',
  newId: IdFactory,
): string {
  const section = createEmptySection('custom', { newId })
  if (section.type !== 'custom') throw new Error('createEmptySection returned the wrong type')

  section.shape = shape
  if (shape === 'entries') section.entries = []
  if (shape === 'bullets') section.bullets = []
  if (shape === 'text') section.text = ''

  doc.sections.push(section)
  return section.id
}

/** Built-in sections are permanent; disabling is how you hide them. */
export function removeSection(doc: CvDocument, sectionId: string): void {
  const index = doc.sections.findIndex((section) => section.id === sectionId)
  if (index < 0) return
  if (doc.sections[index]?.type !== 'custom') return
  doc.sections.splice(index, 1)
}

export function setSummaryText(doc: CvDocument, sectionId: string, text: string): void {
  const section = findSection(doc, sectionId)
  if (section?.type === 'summary') section.text = text
}

export function setCustomText(doc: CvDocument, sectionId: string, text: string): void {
  const section = findSection(doc, sectionId)
  if (section?.type === 'custom') section.text = text
}

export function addTimelineEntry(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const entries = timelineEntriesOf(findSection(doc, sectionId))
  if (!entries) return undefined

  const entry: TimelineEntry = {
    id: newId(),
    role: '',
    organisation: '',
    from: '',
    to: '',
    current: false,
    description: '',
    descriptionMode: 'bullets',
  }
  entries.push(entry)
  return entry.id
}

export function updateTimelineEntry(
  doc: CvDocument,
  sectionId: string,
  entryId: string,
  patch: Partial<TimelineEntry>,
): void {
  const entry = timelineEntriesOf(findSection(doc, sectionId))?.find(
    (candidate) => candidate.id === entryId,
  )
  if (entry) Object.assign(entry, patch)
}

export function addCertEntry(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const entries = certEntriesOf(findSection(doc, sectionId))
  if (!entries) return undefined

  const entry: CertEntry = { id: newId(), name: '', issuer: '', date: '' }
  entries.push(entry)
  return entry.id
}

export function updateCertEntry(
  doc: CvDocument,
  sectionId: string,
  entryId: string,
  patch: Partial<CertEntry>,
): void {
  const entry = certEntriesOf(findSection(doc, sectionId))?.find(
    (candidate) => candidate.id === entryId,
  )
  if (entry) Object.assign(entry, patch)
}

export function addReferenceEntry(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const entries = referenceEntriesOf(findSection(doc, sectionId))
  if (!entries) return undefined

  const entry: ReferenceEntry = {
    id: newId(),
    name: '',
    role: '',
    organisation: '',
    email: '',
    phone: '',
  }
  entries.push(entry)
  return entry.id
}

export function updateReferenceEntry(
  doc: CvDocument,
  sectionId: string,
  entryId: string,
  patch: Partial<ReferenceEntry>,
): void {
  const entry = referenceEntriesOf(findSection(doc, sectionId))?.find(
    (candidate) => candidate.id === entryId,
  )
  if (entry) Object.assign(entry, patch)
}

/** Works for every entry-bearing section, whatever the entry shape. */
export function removeEntry(doc: CvDocument, sectionId: string, entryId: string): void {
  const section = findSection(doc, sectionId)
  const entries: { id: string }[] | undefined =
    timelineEntriesOf(section) ?? certEntriesOf(section) ?? referenceEntriesOf(section)
  if (!entries) return

  const index = entries.findIndex((entry) => entry.id === entryId)
  if (index >= 0) entries.splice(index, 1)
}

export function moveEntry(doc: CvDocument, sectionId: string, from: number, to: number): void {
  const section = findSection(doc, sectionId)
  // Widened to the common shape: reordering never inserts a foreign element,
  // so the three entry types can share one code path.
  const entries: { id: string }[] | undefined =
    timelineEntriesOf(section) ?? certEntriesOf(section) ?? referenceEntriesOf(section)
  if (entries) moveArrayItem(entries, from, to)
}

export function addLeveledItem(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const section = findSection(doc, sectionId)
  if (section?.type !== 'skills' && section?.type !== 'languages') return undefined

  const id = newId()
  section.items.push({ id, name: '' })
  return id
}

export function updateLeveledItem(
  doc: CvDocument,
  sectionId: string,
  itemId: string,
  patch: Partial<SkillItem> | Partial<LanguageItem>,
): void {
  const items = leveledItemsOf(findSection(doc, sectionId))
  const item = items?.find((candidate) => candidate.id === itemId)
  if (item) Object.assign(item, patch)
}

export function removeItem(doc: CvDocument, sectionId: string, itemId: string): void {
  const items: { id: string }[] | undefined = leveledItemsOf(findSection(doc, sectionId))
  if (!items) return

  const index = items.findIndex((item) => item.id === itemId)
  if (index >= 0) items.splice(index, 1)
}

export function moveItem(doc: CvDocument, sectionId: string, from: number, to: number): void {
  const items: { id: string }[] | undefined = leveledItemsOf(findSection(doc, sectionId))
  if (items) moveArrayItem(items, from, to)
}

/** Backs interests, driving-licence classes and custom bullets. */
export function setStringList(doc: CvDocument, sectionId: string, values: string[]): void {
  const section = findSection(doc, sectionId)
  if (!section) return

  if (section.type === 'interests') section.items = values
  else if (section.type === 'drivingLicence') section.classes = values
  else if (section.type === 'custom' && section.shape === 'bullets') section.bullets = values
}
