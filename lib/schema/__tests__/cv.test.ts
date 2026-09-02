import { describe, expect, it } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  SECTION_TYPES,
  cvDocumentSchema,
  sectionSchema,
} from '@/lib/schema/cv'

const validDocument = {
  id: 'doc-1',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: 'Frontend, Oslo',
  language: 'no',
  paper: 'a4',
  updatedAt: 1_700_000_000_000,
  theme: {
    templateId: 'oslo',
    accent: '#2563eb',
    fontPairId: 'inter',
    density: 'normal',
  },
  personalia: {
    firstName: 'Ola',
    lastName: 'Nordmann',
    title: 'Frontendutvikler',
    email: 'ola@example.no',
    phone: '+47 900 00 000',
    city: 'Oslo',
    country: 'Norge',
    showPhoto: true,
    links: [{ id: 'l1', label: 'GitHub', url: 'https://github.com/ola' }],
  },
  sections: [
    { id: 's1', type: 'summary', enabled: true, text: 'Hei.' },
    {
      id: 's2',
      type: 'experience',
      enabled: true,
      entries: [
        {
          id: 'e1',
          role: 'Utvikler',
          organisation: 'Acme AS',
          from: '2022-01',
          to: '',
          current: true,
          description: 'Ledet team\nKuttet lastetid',
          descriptionMode: 'bullets',
        },
      ],
    },
  ],
}

describe('cvDocumentSchema', () => {
  it('accepts a valid document', () => {
    const result = cvDocumentSchema.safeParse(validDocument)
    expect(result.success).toBe(true)
  })

  it('rejects an unknown CV language', () => {
    const result = cvDocumentSchema.safeParse({ ...validDocument, language: 'de' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown paper size', () => {
    const result = cvDocumentSchema.safeParse({ ...validDocument, paper: 'a3' })
    expect(result.success).toBe(false)
  })

  it('requires personalia to declare photo visibility', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to omit
    const { showPhoto, ...personaliaWithoutFlag } = validDocument.personalia
    const result = cvDocumentSchema.safeParse({
      ...validDocument,
      personalia: personaliaWithoutFlag,
    })
    expect(result.success).toBe(false)
  })
})

describe('sectionSchema', () => {
  it('accepts a skills section with a 5-step level', () => {
    const result = sectionSchema.safeParse({
      id: 's3',
      type: 'skills',
      enabled: true,
      items: [{ id: 'i1', name: 'TypeScript', level: 5 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a skill level outside the 5-step scale', () => {
    const result = sectionSchema.safeParse({
      id: 's3',
      type: 'skills',
      enabled: true,
      items: [{ id: 'i1', name: 'TypeScript', level: 6 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a languages section using the CEFR scale', () => {
    const result = sectionSchema.safeParse({
      id: 's4',
      type: 'languages',
      enabled: true,
      items: [
        { id: 'i1', name: 'Norsk', level: 'native' },
        { id: 'i2', name: 'Engelsk', level: 'c1' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a numeric level on a languages section', () => {
    const result = sectionSchema.safeParse({
      id: 's4',
      type: 'languages',
      enabled: true,
      items: [{ id: 'i1', name: 'Norsk', level: 5 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a custom section with the bullets shape', () => {
    const result = sectionSchema.safeParse({
      id: 's5',
      type: 'custom',
      enabled: true,
      title: 'Publikasjoner',
      shape: 'bullets',
      bullets: ['En artikkel'],
    })
    expect(result.success).toBe(true)
  })

  it('exposes every section type in SECTION_TYPES', () => {
    expect(SECTION_TYPES).toContain('drivingLicence')
    expect(new Set(SECTION_TYPES).size).toBe(SECTION_TYPES.length)
  })
})
