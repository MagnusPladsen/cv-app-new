import { describe, expect, it } from 'vitest'

import { parseCv, type Line } from '@/lib/import/parse-cv'
import { isImportPile } from '@/lib/import/pile'
import { ACCEPT_ALL, documentFromParse, mergeParse } from '@/lib/import/to-document'
import { cvDocumentSchema, type CvDocument } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'

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
    const parsed = parseCv(lines('Militærtjeneste\nIngeniørbataljonen, Skjold leir'))
    const document = documentFromParse(parsed, ACCEPT_ALL)
    const custom = document.sections.find((s) => s.type === 'custom')
    expect(custom).toBeDefined()
    expect(JSON.stringify(custom)).toContain('Skjold leir')
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

describe('adding an import to a CV already being written', () => {
  /** A CV with a name, one real job, and the blank rows the editor seeds. */
  function inProgress(): CvDocument {
    const document = createEmptyDocument()
    document.personalia.firstName = 'Kari'
    document.personalia.lastName = 'Hansen'
    document.personalia.email = ''
    for (const s of document.sections) {
      if (s.type === 'experience') {
        s.enabled = true
        s.entries = [
          {
            id: 'mine',
            role: 'Butikkmedarbeider',
            organisation: 'Rema',
            from: '2010-01',
            to: '2012-01',
            current: false,
            descriptionMode: 'bullets',
          },
        ]
      }
      if (s.type === 'education') {
        s.enabled = true
        s.entries = [
          {
            id: 'seeded',
            role: '',
            organisation: '',
            from: '',
            to: '',
            current: false,
            descriptionMode: 'bullets',
          },
        ]
      }
      if (s.type === 'skills') s.items = [{ id: 'typed', name: 'typescript' }, { id: 'blank', name: '' }]
      if (s.type === 'summary') s.text = 'Min egen tekst.'
    }
    return document
  }

  it('never changes anything already written', () => {
    const document = inProgress()
    mergeParse(document, SAMPLE, ACCEPT_ALL)

    expect(document.personalia.firstName).toBe('Kari')
    expect(document.personalia.lastName).toBe('Hansen')
    expect(section(document, 'summary')).toMatchObject({ text: 'Min egen tekst.' })
    const experience = section(document, 'experience')
    expect(experience?.type === 'experience' && experience.entries[0]?.id).toBe('mine')
  })

  it('fills the fields that were empty', () => {
    const document = inProgress()
    mergeParse(document, SAMPLE, ACCEPT_ALL)
    expect(document.personalia.email).toBe('ola@example.no')
    expect(document.personalia.links.map((link) => link.url)).toEqual([
      'https://github.com/olanordmann',
    ])
  })

  it('adds jobs after the ones there, and replaces the blank row it finds', () => {
    const document = inProgress()
    mergeParse(document, SAMPLE, ACCEPT_ALL)

    const experience = section(document, 'experience')
    expect(experience?.type === 'experience' && experience.entries.map((e) => e.role)).toEqual([
      'Butikkmedarbeider',
      'Senior utvikler, Acme',
    ])
    const education = section(document, 'education')
    expect(education?.type === 'education' && education.entries).toHaveLength(1)
    expect(education?.type === 'education' && education.entries[0]?.id).not.toBe('seeded')
  })

  it('adds list items once, ignoring case, and drops blank ones', () => {
    const document = inProgress()
    mergeParse(document, SAMPLE, ACCEPT_ALL)
    const skills = section(document, 'skills')
    expect(skills?.type === 'skills' && skills.items.map((item) => item.name)).toEqual([
      'typescript',
      'React',
    ])
    expect(skills?.enabled).toBe(true)
  })

  it('keeps the leftovers in a section of their own, in the CV’s language', () => {
    const document = inProgress()
    document.language = 'en'
    mergeParse(document, SAMPLE, ACCEPT_ALL)
    const custom = document.sections.find((s) => s.type === 'custom')
    expect(custom).toMatchObject({ title: 'To sort: text from the import', imported: true })
  })

  it('adds a second import’s leftovers to the pile already waiting', () => {
    const document = inProgress()
    mergeParse(document, SAMPLE, ACCEPT_ALL)
    mergeParse(document, SAMPLE, ACCEPT_ALL)
    const piles = document.sections.filter((s) => s.type === 'custom')
    expect(piles).toHaveLength(1)
    expect(piles[0]?.type === 'custom' && piles[0].bullets).toHaveLength(
      SAMPLE.unrecognised.length * 2,
    )
  })

  it('leaves a CV the schema still accepts', () => {
    const document = inProgress()
    mergeParse(document, SAMPLE, ACCEPT_ALL)
    expect(cvDocumentSchema.safeParse(document).success).toBe(true)
  })

  it('adds nothing that was declined', () => {
    const document = inProgress()
    const before = JSON.stringify(document)
    const nothing = Object.fromEntries(
      Object.keys(ACCEPT_ALL).map((key) => [key, false]),
    ) as typeof ACCEPT_ALL
    mergeParse(document, SAMPLE, nothing)
    expect(JSON.stringify(document)).toBe(before)
  })
})

describe('a CV imported before the section carried a flag', () => {
  it('is recognised by the name it was given then', () => {
    const document = createEmptyDocument()
    document.sections.push({
      id: 'old',
      type: 'custom',
      enabled: true,
      title: 'Fra den gamle CV-en',
      shape: 'bullets',
      bullets: ['Husk!'],
    })
    expect(isImportPile(document.sections.at(-1)!)).toBe(true)
  })

  it('leaves a section somebody named themselves alone', () => {
    const document = createEmptyDocument()
    document.sections.push({
      id: 'mine',
      type: 'custom',
      enabled: true,
      title: 'Verv',
      shape: 'bullets',
      bullets: ['Styreleder'],
    })
    expect(isImportPile(document.sections.at(-1)!)).toBe(false)
  })
})

describe('links somebody can read', () => {
  it('names the site rather than printing the path', () => {
    const parsed = parseCv(
      lines(`
Ola Nordmann
ola@example.no
linkedin.com/in/olanordmann
github.com/olanordmann
https://ola.dev/portefolje
`),
    )
    const document = documentFromParse(parsed, ACCEPT_ALL)
    expect(document.personalia.links.map((link) => link.label)).toEqual([
      'LinkedIn',
      'GitHub',
      'ola.dev',
    ])
    expect(document.personalia.links[0]?.url).toBe('https://linkedin.com/in/olanordmann')
  })
})
