import { describe, expect, it } from 'vitest'

import { findDateRange, parseCv, type Line } from '@/lib/import/parse-cv'

const lines = (text: string): Line[] =>
  text
    .trim()
    .split('\n')
    .map((line) => ({ text: line.trim() }))

/** A plain one-column Norwegian CV, the shape most people export. */
const NORWEGIAN = `
Ola Nordmann
Frontendutvikler
ola.nordmann@example.no · +47 900 11 223 · Oslo
github.com/olanordmann

Om meg
Frontendutvikler med ti års erfaring fra finans og offentlig sektor.
Trives best der design og utvikling møtes.

Arbeidserfaring
Senior frontendutvikler, Nordvest Digital · aug. 2021 – nå
Oslo
• Ledet et team på fire gjennom en replattforming til Next.js
• Kuttet lastetid på hovedflyten med 42 prosent
Frontendutvikler, Statens pensjonskasse · jan. 2018 – jul. 2021
• Bygde selvbetjeningsløsning brukt av 240 000 medlemmer

Utdanning
Master i informatikk, Universitetet i Oslo · 2013 – 2015
Bachelor i informatikk, NTNU · 2010 – 2013

Ferdigheter
TypeScript, React, Next.js, Tilgjengelighet (WCAG), Figma

Språk
Norsk, Engelsk, Tysk

Interesser
Klatring, Langrenn, Brettspill
`

describe('findDateRange', () => {
  it('reads Norwegian month names', () => {
    expect(findDateRange('aug. 2021 – jul. 2023')).toMatchObject({
      from: '2021-08',
      to: '2023-07',
      current: false,
    })
  })

  it('understands that the job is still going', () => {
    for (const ending of ['nå', 'd.d.', 'i dag', 'present', 'now']) {
      expect(findDateRange(`jan. 2020 – ${ending}`), ending).toMatchObject({
        from: '2020-01',
        current: true,
      })
    }
  })

  it('reads numeric dates', () => {
    expect(findDateRange('08/2021 - 07/2023')).toMatchObject({ from: '2021-08', to: '2023-07' })
  })

  it('accepts years alone, since a CV that gives only years still has entries', () => {
    const range = findDateRange('2013 – 2015')
    expect(range).not.toBeNull()
    expect(range?.from).toBe('')
  })

  it('hands back what the line said besides the date', () => {
    expect(findDateRange('Senior utvikler, Acme · aug. 2021 – nå')?.rest).toBe(
      'Senior utvikler, Acme',
    )
  })

  it('finds no date where there is none', () => {
    expect(findDateRange('Ledet et team på fire')).toBeNull()
    // A number that is not a year.
    expect(findDateRange('Kuttet lastetid med 42 prosent')).toBeNull()
  })
})

describe('parsing a plain Norwegian CV', () => {
  const parsed = parseCv(lines(NORWEGIAN))

  it('takes the contact details, which are the reliable part', () => {
    expect(parsed.personalia.email).toBe('ola.nordmann@example.no')
    expect(parsed.personalia.phone).toContain('900 11 223')
    expect(parsed.personalia.links).toContain('github.com/olanordmann')
  })

  it('takes the name and the title under it', () => {
    expect(parsed.personalia.firstName).toBe('Ola')
    expect(parsed.personalia.lastName).toBe('Nordmann')
    expect(parsed.personalia.title).toBe('Frontendutvikler')
  })

  it('keeps the summary as written', () => {
    expect(parsed.summary).toContain('ti års erfaring')
  })

  it('finds both jobs, in order, with their dates', () => {
    expect(parsed.experience).toHaveLength(2)
    expect(parsed.experience[0]).toMatchObject({ from: '2021-08', to: '', current: true })
    expect(parsed.experience[0]?.role).toContain('Senior frontendutvikler')
    expect(parsed.experience[1]).toMatchObject({ from: '2018-01', to: '2021-07', current: false })
  })

  it('keeps the bullets with the job they belong to', () => {
    expect(parsed.experience[0]?.bullets).toHaveLength(2)
    expect(parsed.experience[0]?.bullets[0]).toContain('Ledet et team')
    expect(parsed.experience[1]?.bullets[0]).toContain('240 000 medlemmer')
  })

  it('finds both educations', () => {
    expect(parsed.education).toHaveLength(2)
    expect(parsed.education[0]?.role).toContain('Master i informatikk')
  })

  it('splits the lists', () => {
    expect(parsed.skills).toContain('TypeScript')
    expect(parsed.skills).toContain('Tilgjengelighet (WCAG)')
    expect(parsed.languages).toEqual(['Norsk', 'Engelsk', 'Tysk'])
    expect(parsed.interests).toContain('Klatring')
  })
})

describe('what it refuses to guess', () => {
  it('hands back sections it has no home for, rather than dropping them', () => {
    const parsed = parseCv(
      lines(`
Referanser
Kari Solberg, Utviklingssjef · kari@example.no
`),
    )
    expect(parsed.unrecognised.join(' ')).toContain('Kari Solberg')
  })

  it('returns empty rather than inventing anything from an empty document', () => {
    const parsed = parseCv([])
    expect(parsed.experience).toEqual([])
    expect(parsed.personalia.email).toBe('')
  })

  it('does not treat a long sentence as a heading', () => {
    const parsed = parseCv(
      lines('Jeg har lang erfaring med utdanning og opplæring av nye utviklere'),
    )
    expect(parsed.education).toEqual([])
    expect(parsed.unrecognised).toHaveLength(1)
  })
})

describe('letter-spaced headings', () => {
  it('recognises a heading the PDF spread out', () => {
    // CV templates track their headings, and a PDF records that as real
    // spaces: "ARBEIDSERFARING" comes back as "A R B E I D S E R F A R I N G",
    // with the word boundary gone. Measured on a real export: without this,
    // no section was recognised at all, and two jobs became zero.
    const parsed = parseCv(
      lines(`
O M M E G
Utvikler med ti års erfaring.

A R B E I D S E R F A R I N G
Senior utvikler, Acme · aug. 2021 – nå

F E R D I G H E T E R
TypeScript, React

S P R Å K
Norsk, Engelsk
`),
    )

    expect(parsed.summary).toContain('ti års erfaring')
    expect(parsed.experience).toHaveLength(1)
    expect(parsed.skills).toContain('TypeScript')
    expect(parsed.languages).toEqual(['Norsk', 'Engelsk'])
  })

  it('does not mistake an ordinary short line for one', () => {
    const parsed = parseCv(lines('Jeg er en av dem'))
    expect(parsed.unrecognised).toEqual(['Jeg er en av dem'])
  })
})

describe('English CVs', () => {
  it('reads the same shape with English headings', () => {
    const parsed = parseCv(
      lines(`
Jane Doe
Product Designer
jane@example.com

Work Experience
Senior Designer, Acme · Mar 2019 - Present
• Led the redesign of the checkout flow

Education
BSc Design, University of Oslo · 2014 - 2017

Skills
Figma, Prototyping, Design systems
`),
    )
    expect(parsed.personalia.firstName).toBe('Jane')
    expect(parsed.experience).toHaveLength(1)
    expect(parsed.experience[0]?.current).toBe(true)
    expect(parsed.education).toHaveLength(1)
    expect(parsed.skills).toContain('Figma')
  })
})

describe('the name, when type size is known', () => {
  it('takes the largest line rather than the first', () => {
    // Some CVs open with a label above the name.
    const parsed = parseCv([
      { text: 'CURRICULUM VITAE', size: 9 },
      { text: 'Ola Nordmann', size: 22 },
      { text: 'Frontendutvikler', size: 11 },
    ])
    expect(parsed.personalia.firstName).toBe('Ola')
    expect(parsed.personalia.title).toBe('Frontendutvikler')
  })
})
