import { describe, expect, it } from 'vitest'
import { cvDocumentSchema, type CvDocument } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import {
  addCustomSection,
  addLeveledItem,
  addTimelineEntry,
  findSection,
  moveArrayItem,
  moveEntry,
  moveSection,
  removeEntry,
  removeSection,
  setSectionEnabled,
  setSectionTitle,
  setStringList,
  setSummaryText,
  updateLeveledItem,
  updateTimelineEntry,
} from '@/lib/store/document-actions'

let counter = 0
const newId = () => `id-${++counter}`

function doc(): CvDocument {
  counter = 0
  return createEmptyDocument({}, { newId, now: () => 1_700_000_000_000 })
}

function sectionIdOf(document: CvDocument, type: string): string {
  return document.sections.find((section) => section.type === type)!.id
}

describe('moveArrayItem', () => {
  it('moves an item forward', () => {
    const items = ['a', 'b', 'c']
    moveArrayItem(items, 0, 2)
    expect(items).toEqual(['b', 'c', 'a'])
  })

  it('moves an item backward', () => {
    const items = ['a', 'b', 'c']
    moveArrayItem(items, 2, 0)
    expect(items).toEqual(['c', 'a', 'b'])
  })

  it('ignores an out-of-range index', () => {
    const items = ['a', 'b']
    moveArrayItem(items, 5, 0)
    moveArrayItem(items, 0, -1)
    expect(items).toEqual(['a', 'b'])
  })
})

describe('section mutators', () => {
  it('enables and disables a section', () => {
    const d = doc()
    const id = sectionIdOf(d, 'certifications')
    setSectionEnabled(d, id, true)
    expect(findSection(d, id)?.enabled).toBe(true)
    setSectionEnabled(d, id, false)
    expect(findSection(d, id)?.enabled).toBe(false)
  })

  it('sets and clears a title override', () => {
    const d = doc()
    const id = sectionIdOf(d, 'experience')
    setSectionTitle(d, id, 'Relevant erfaring')
    expect(findSection(d, id)?.titleOverride).toBe('Relevant erfaring')
    setSectionTitle(d, id, '   ')
    expect(findSection(d, id)?.titleOverride).toBeUndefined()
  })

  it('reorders sections', () => {
    const d = doc()
    const [first, second] = d.sections.map((section) => section.type)
    moveSection(d, 0, 1)
    expect(d.sections[0]?.type).toBe(second)
    expect(d.sections[1]?.type).toBe(first)
  })

  it('adds a custom section at the end and returns its id', () => {
    const d = doc()
    const id = addCustomSection(d, 'bullets', newId)
    expect(d.sections.at(-1)?.id).toBe(id)
    expect(findSection(d, id)).toMatchObject({ type: 'custom', shape: 'bullets' })
  })

  it('removes a custom section', () => {
    const d = doc()
    const id = addCustomSection(d, 'text', newId)
    removeSection(d, id)
    expect(findSection(d, id)).toBeUndefined()
  })

  it('refuses to remove a built-in section', () => {
    const d = doc()
    const id = sectionIdOf(d, 'experience')
    removeSection(d, id)
    expect(findSection(d, id)).toBeDefined()
  })

  it('keeps the document schema-valid after mutation', () => {
    const d = doc()
    addCustomSection(d, 'bullets', newId)
    moveSection(d, 0, 3)
    setSectionEnabled(d, sectionIdOf(d, 'interests'), true)
    expect(cvDocumentSchema.safeParse(d).success).toBe(true)
  })
})

describe('entry mutators', () => {
  it('adds, updates, reorders and removes timeline entries', () => {
    const d = doc()
    const id = sectionIdOf(d, 'experience')

    const first = addTimelineEntry(d, id, newId)!
    const second = addTimelineEntry(d, id, newId)!
    updateTimelineEntry(d, id, first, { role: 'Utvikler' })

    const section = findSection(d, id)!
    expect('entries' in section && section.entries).toHaveLength(2)

    moveEntry(d, id, 0, 1)
    const reordered = findSection(d, id)!
    expect('entries' in reordered && reordered.entries?.[0]?.id).toBe(second)

    removeEntry(d, id, first)
    const after = findSection(d, id)!
    expect('entries' in after && after.entries).toHaveLength(1)
  })

  it('ignores a timeline mutation on a skills section', () => {
    const d = doc()
    const id = sectionIdOf(d, 'skills')
    expect(addTimelineEntry(d, id, newId)).toBeUndefined()
    expect(cvDocumentSchema.safeParse(d).success).toBe(true)
  })

  it('ignores a mutation for an unknown section id', () => {
    const d = doc()
    expect(() => updateTimelineEntry(d, 'nope', 'nope', { role: 'x' })).not.toThrow()
    expect(() => removeEntry(d, 'nope', 'nope')).not.toThrow()
  })
})

describe('item mutators', () => {
  it('adds and updates a skill with a numeric level', () => {
    const d = doc()
    const id = sectionIdOf(d, 'skills')
    const itemId = addLeveledItem(d, id, newId)!
    updateLeveledItem(d, id, itemId, { name: 'TypeScript', level: 4 })

    const section = findSection(d, id)!
    expect('items' in section && section.items[0]).toMatchObject({
      name: 'TypeScript',
      level: 4,
    })
  })

  it('adds and updates a language with a CEFR level', () => {
    const d = doc()
    const id = sectionIdOf(d, 'languages')
    const itemId = addLeveledItem(d, id, newId)!
    updateLeveledItem(d, id, itemId, { name: 'Norsk', level: 'native' })
    expect(cvDocumentSchema.safeParse(d).success).toBe(true)
  })
})

describe('string list mutators', () => {
  it('sets interests', () => {
    const d = doc()
    const id = sectionIdOf(d, 'interests')
    setStringList(d, id, ['Klatring', 'Fotografi'])
    const section = findSection(d, id)!
    expect('items' in section && section.items).toEqual(['Klatring', 'Fotografi'])
  })

  it('sets driving licence classes', () => {
    const d = doc()
    const id = sectionIdOf(d, 'drivingLicence')
    setStringList(d, id, ['B', 'BE'])
    const section = findSection(d, id)!
    expect('classes' in section && section.classes).toEqual(['B', 'BE'])
  })

  it('sets summary text', () => {
    const d = doc()
    const id = sectionIdOf(d, 'summary')
    setSummaryText(d, id, 'Hei.')
    const section = findSection(d, id)!
    expect('text' in section && section.text).toBe('Hei.')
  })
})
