import { describe, expect, it } from 'vitest'

import { SECTION_TYPES, cvDocumentSchema, type Section } from '@/lib/schema/cv'
import { createDemoDocument } from '@/lib/schema/demo'

function demo() {
  let counter = 0
  return createDemoDocument(
    {},
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )
}

function sectionOf(type: string): Section {
  return demo().sections.find((section) => section.type === type)!
}

describe('createDemoDocument', () => {
  it('satisfies the schema', () => {
    expect(cvDocumentSchema.safeParse(demo()).success).toBe(true)
  })

  it('is deterministic given fixed deps', () => {
    expect(demo()).toEqual(demo())
  })

  it('has a long name and title, which is what exposes wrapping bugs', () => {
    const { personalia } = demo()
    expect(`${personalia.firstName} ${personalia.lastName}`.length).toBeGreaterThan(20)
    expect(personalia.title.length).toBeGreaterThan(20)
  })

  it('has several links', () => {
    expect(demo().personalia.links.length).toBeGreaterThanOrEqual(3)
  })

  it('enables every section type except custom', () => {
    const enabled = new Set(
      demo()
        .sections.filter((section) => section.enabled)
        .map((section) => section.type),
    )
    for (const type of SECTION_TYPES) {
      if (type === 'custom') continue
      if (type === 'projects' || type === 'courses' || type === 'volunteering') continue
      if (type === 'drivingLicence') continue
      expect(enabled, `${type} should be enabled in the demo`).toContain(type)
    }
  })

  it('has three experience entries, each with multiple bullets', () => {
    const experience = sectionOf('experience')
    if (experience.type !== 'experience') throw new Error('wrong section type')

    expect(experience.entries).toHaveLength(3)
    for (const entry of experience.entries) {
      expect(entry.description?.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('mixes levelled and unlevelled skills', () => {
    const skills = sectionOf('skills')
    if (skills.type !== 'skills') throw new Error('wrong section type')

    expect(skills.items.some((item) => item.level !== undefined)).toBe(true)
    expect(skills.items.some((item) => item.level === undefined)).toBe(true)
  })

  it('covers both ends of the CEFR scale', () => {
    const languages = sectionOf('languages')
    if (languages.type !== 'languages') throw new Error('wrong section type')

    const levels = languages.items.map((item) => item.level)
    expect(levels).toContain('native')
    expect(levels.some((level) => level && level !== 'native')).toBe(true)
  })

  it('lists a referee, so the on-request fallback is not what renders', () => {
    const references = sectionOf('references')
    if (references.type !== 'references') throw new Error('wrong section type')
    expect(references.entries).toHaveLength(1)
  })
})

describe('demo photo', () => {
  it('carries a placeholder portrait so photo templates can be reviewed', () => {
    const { personalia } = demo()
    expect(personalia.showPhoto).toBe(true)
    expect(personalia.photo?.dataUrl.startsWith('data:image/')).toBe(true)
  })
})
