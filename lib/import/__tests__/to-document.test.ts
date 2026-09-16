import { describe, expect, it } from 'vitest'

import { parseCv, type Line } from '@/lib/import/parse-cv'
import { ACCEPT_ALL, documentFromParse } from '@/lib/import/to-document'
import { cvDocumentSchema } from '@/lib/schema/cv'

const lines = (text: string): Line[] =>
  text.trim().split('\n').map((line) => ({ text: line.trim() }))

const SAMPLE = parseCv(
  lines(`
Ola Nordmann
Frontendutvikler
ola@example.no · +47 900 11 223
github.com/olanordmann

Om meg
Utvikler med ti års erfaring.

Arbeidserfaring
Senior utvikler, Acme · aug. 2021 – nå
• Ledet et team på fire

Utdanning
Master i informatikk, UiO · 2013 – 2015

Ferdigheter
TypeScript, React

Referanser
Kari Solberg, kari@example.no
`),
)

const section = (doc: ReturnType<typeof documentFromParse>, type: string) =>
  doc.sections.find((s) => s.type === type)

describe('building a CV from a parse', () => {
  it('produces something the schema accepts', () => {
    // Everything else here is moot if the store would reject it.
    const document = documentFromParse(SAMPLE, ACCEPT_ALL)
    expect(cvDocumentSchema.safeParse(document).success).toBe(true)
  })

  it('carries the personalia across', () => {
    const document = documentFromParse(SAMPLE, ACCEPT_ALL)
    expect(document.personalia.firstName).toBe('Ola')
    expect(document.personalia.email).toBe('ola@example.no')
    expect(document.personalia.links[0]?.url).toBe('https://github.com/olanordmann')
  })

  it('switches on only the sections it actually filled', () => {
    const document = documentFromParse(SAMPLE, ACCEPT_ALL)
    expect(section(document, 'experience')?.enabled).toBe(true)
    expect(section(document, 'skills')?.enabled).toBe(true)
    // Nothing was found for these, so they stay off rather than appearing
    // switched on and empty.
    expect(section(document, 'languages')?.enabled).toBe(false)
    expect(section(document, 'certifications')?.enabled).toBe(false)
  })

  it('keeps what it could not place, rather than dropping it', () => {
    const document = documentFromParse(SAMPLE, ACCEPT_ALL)
    const custom = document.sections.find((s) => s.type === 'custom')
    expect(custom).toBeDefined()
    expect(JSON.stringify(custom)).toContain('Kari Solberg')
  })

  it('honours a section being declined', () => {
    const document = documentFromParse(SAMPLE, { ...ACCEPT_ALL, experience: false })
    expect(section(document, 'experience')?.enabled).toBe(false)
  })

  it('declining the leftovers leaves no extra section', () => {
    const document = documentFromParse(SAMPLE, { ...ACCEPT_ALL, unrecognised: false })
    expect(document.sections.some((s) => s.type === 'custom')).toBe(false)
  })

  it('declining the personalia keeps the CV anonymous', () => {
    const document = documentFromParse(SAMPLE, { ...ACCEPT_ALL, personalia: false })
    expect(document.personalia.firstName).toBe('')
    expect(document.personalia.email).toBe('')
  })

  it('gives every entry and item its own id', () => {
    const document = documentFromParse(SAMPLE, ACCEPT_ALL)
    const ids = JSON.stringify(document).match(/"id":"[^"]+"/g) ?? []
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('imports an empty parse without inventing a thing', () => {
    const empty = parseCv([])
    const document = documentFromParse(empty, ACCEPT_ALL)
    expect(cvDocumentSchema.safeParse(document).success).toBe(true)
    expect(document.sections.every((s) => !s.enabled)).toBe(true)
  })
})
