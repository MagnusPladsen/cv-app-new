import { describe, expect, it } from 'vitest'

import { cvDisplayName } from '@/lib/cv-name'
import { createEmptyDocument } from '@/lib/schema/defaults'

const doc = (overrides: Partial<ReturnType<typeof createEmptyDocument>> = {}) => ({
  ...createEmptyDocument({}, { newId: () => 'id', now: () => Date.UTC(2026, 8, 15) }),
  ...overrides,
})

describe('cvDisplayName', () => {
  it('uses the person and the day it was made', () => {
    const document = doc()
    document.personalia = { ...document.personalia, firstName: 'Ola', lastName: 'Nordmann' }
    expect(cvDisplayName(document, 'no')).toBe('Ola Nordmann · 15.09.2026')
  })

  it('falls back to the date alone before there is a name', () => {
    expect(cvDisplayName(doc(), 'no')).toBe('CV · 15.09.2026')
  })

  it('formats the date for the reader', () => {
    expect(cvDisplayName(doc(), 'en')).toMatch(/09\/15\/2026|15\/09\/2026/)
  })

  it('lets an explicit name win, which is how you opt out', () => {
    expect(cvDisplayName(doc({ name: 'Søknad NAV' }), 'no')).toBe('Søknad NAV')
  })

  it('treats a whitespace name as no name', () => {
    expect(cvDisplayName(doc({ name: '   ' }), 'no')).toBe('CV · 15.09.2026')
  })

  it('copes with only half a name', () => {
    const document = doc()
    document.personalia = { ...document.personalia, firstName: 'Ola', lastName: '' }
    expect(cvDisplayName(document, 'no')).toBe('Ola · 15.09.2026')
  })

  it('uses updatedAt for documents saved before createdAt existed', () => {
    // The field is optional, and older saved CVs simply do not have it.
    const document = doc({ updatedAt: Date.UTC(2025, 0, 2) })
    delete (document as { createdAt?: number }).createdAt
    expect(cvDisplayName(document, 'no')).toBe('CV · 02.01.2025')
  })

  it('does not change as the CV is edited', () => {
    // The point is telling two CVs apart. A name that moved every time you
    // typed would be useless for that.
    const document = doc()
    const before = cvDisplayName(document, 'no')
    document.updatedAt = Date.UTC(2027, 5, 1)
    expect(cvDisplayName(document, 'no')).toBe(before)
  })
})
