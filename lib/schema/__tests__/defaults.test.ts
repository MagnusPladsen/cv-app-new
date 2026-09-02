import { describe, expect, it } from 'vitest'
import { cvDocumentSchema, CURRENT_SCHEMA_VERSION } from '@/lib/schema/cv'
import {
  DEFAULT_ENABLED_SECTIONS,
  DEFAULT_SECTION_ORDER,
  createEmptyDocument,
  createEmptySection,
} from '@/lib/schema/defaults'

function deterministicDeps() {
  let counter = 0
  return { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 }
}

describe('createEmptyDocument', () => {
  it('produces a document that satisfies the schema', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(cvDocumentSchema.safeParse(doc).success).toBe(true)
  })

  it('stamps the current schema version', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('defaults to Norwegian on A4 with the oslo template', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.language).toBe('no')
    expect(doc.paper).toBe('a4')
    expect(doc.theme.templateId).toBe('oslo')
    expect(doc.theme.density).toBe('normal')
  })

  it('honours explicit input', () => {
    const doc = createEmptyDocument(
      { name: 'Backend, London', language: 'en', paper: 'letter', templateId: 'bergen' },
      deterministicDeps(),
    )
    expect(doc.name).toBe('Backend, London')
    expect(doc.language).toBe('en')
    expect(doc.paper).toBe('letter')
    expect(doc.theme.templateId).toBe('bergen')
  })

  it('shows the photo by default', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.personalia.showPhoto).toBe(true)
  })

  it('creates one section per default type, in order', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.sections.map((s) => s.type)).toEqual([...DEFAULT_SECTION_ORDER])
  })

  it('enables only the default-enabled sections', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    const enabled = doc.sections.filter((s) => s.enabled).map((s) => s.type)
    expect(enabled).toEqual(
      DEFAULT_SECTION_ORDER.filter((t) =>
        (DEFAULT_ENABLED_SECTIONS as readonly string[]).includes(t),
      ),
    )
  })

  it('gives every section a unique id', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    const ids = doc.sections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('createEmptySection', () => {
  it('creates an experience section with no entries', () => {
    const section = createEmptySection('experience', deterministicDeps())
    expect(section).toMatchObject({ type: 'experience', enabled: true, entries: [] })
  })

  it('creates a custom section with the bullets shape by default', () => {
    const section = createEmptySection('custom', deterministicDeps())
    expect(section).toMatchObject({ type: 'custom', shape: 'bullets', bullets: [] })
  })

  it('creates a driving licence section with no classes', () => {
    const section = createEmptySection('drivingLicence', deterministicDeps())
    expect(section).toMatchObject({ type: 'drivingLicence', classes: [] })
  })
})
