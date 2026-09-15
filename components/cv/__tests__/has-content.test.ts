import { describe, expect, it } from 'vitest'

import { hasContent } from '@/components/cv/has-content'
import { splitSections } from '@/components/cv/split-sections'
import { createEmptyDocument } from '@/lib/schema/defaults'
import type { Section } from '@/lib/schema/cv'

const doc = () => createEmptyDocument({}, { newId: () => `id-${Math.random()}`, now: () => 0 })

describe('hasContent', () => {
  it('finds nothing in a brand new document', () => {
    // The state a real export was made in: four headings over blank space,
    // which reads as a broken PDF rather than an empty CV.
    for (const section of doc().sections) {
      expect(hasContent(section), `${section.type} looked filled while empty`).toBe(false)
    }
  })

  it('judges an entry by what it names, not by its dates', () => {
    const entry = {
      id: 'e1',
      role: '',
      organisation: '',
      location: '',
      from: '2020-01',
      to: '2021-01',
      current: false,
      descriptionMode: 'bullets' as const,
    }
    const section = { id: 's', type: 'experience' as const, enabled: true, entries: [entry] }
    expect(hasContent(section)).toBe(false)
    expect(hasContent({ ...section, entries: [{ ...entry, role: 'Utvikler' }] })).toBe(true)
  })

  it('ignores whitespace, the way the renderers do', () => {
    const section = { id: 's', type: 'summary' as const, enabled: true, text: '   \n ' }
    expect(hasContent(section)).toBe(false)
    expect(hasContent({ ...section, text: 'Hei' })).toBe(true)
  })

  it('covers every section type', () => {
    // A new section type that falls through would render an empty heading
    // again, and nothing else would notice.
    const seen = new Set(doc().sections.map((section) => section.type))
    for (const type of seen) {
      const section = doc().sections.find((s) => s.type === type)!
      expect(() => hasContent(section), `${type} is unhandled`).not.toThrow()
    }
  })
})

describe('what reaches the page', () => {
  it('drops an empty section from both columns', () => {
    const sections = doc().sections.map((section) => ({ ...section, enabled: true }))
    const split = splitSections(sections as Section[], ['skills', 'languages'])
    expect(split.main).toEqual([])
    expect(split.sidebar).toEqual([])
  })

  it('keeps a section the moment it has something in it', () => {
    const sections = doc().sections.map((section) =>
      section.type === 'summary'
        ? { ...section, enabled: true, text: 'Frontendutvikler' }
        : { ...section, enabled: true },
    )
    const split = splitSections(sections as Section[], undefined)
    expect(split.main.map((section) => section.type)).toEqual(['summary'])
  })
})
