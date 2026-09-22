import { describe, expect, it } from 'vitest'

import { isLinkedInExport } from '@/lib/import/linkedin'
import { parseCv, type Line } from '@/lib/import/parse-cv'

/**
 * LinkedIn's "Save to PDF", which is the file most people will reach for:
 * two clicks, no writing. Its layout is its own - a sidebar first, the
 * employer above the role, a duration after the dates, a page footer - and
 * read as an ordinary CV it produced no jobs at all.
 */

const EXPORT = `
Contact
ola@example.no
www.linkedin.com/in/olanordmann
(LinkedIn)
github.com/olanordmann
(Other)
Top Skills
TypeScript
React
Languages
Norsk (Native or bilingual)
Engelsk (Full professional)
Ola Nordmann
Senior frontendutvikler hos Nordvest Digital
Oslo, Norway
Summary
Frontendutvikler med ti års erfaring fra finans.
Experience
Nordvest Digital
Senior frontendutvikler
August 2021 - Present (4 years 1 month)
Oslo, Norway
Ledet et team på fire.
Statens pensjonskasse
Frontendutvikler
January 2018 - July 2021 (3 years 7 months)
Bygde selvbetjeningsløsning.
Education
Universitetet i Oslo
Master i informatikk · (2013 - 2015)
Page 1 of 2
`

/**
 * The sidebar and the main column are two columns on the real page, and the
 * PDF reader marks where the second begins. Said here rather than left out,
 * because without it the sidebar's last list runs into the name.
 */
const lines = (text: string): Line[] =>
  text
    .trim()
    .split('\n')
    .map((line) => ({
      text: line.trim(),
      ...(line.trim() === 'Ola Nordmann' ? { columnStart: true } : {}),
    }))

describe('recognising the export', () => {
  it('knows one by two of its marks', () => {
    expect(isLinkedInExport(lines(EXPORT))).toBe(true)
  })

  it('does not mistake an ordinary CV for one', () => {
    expect(
      isLinkedInExport(
        lines(`
Ola Nordmann
Sammendrag
Utvikler med ti års erfaring.
Arbeidserfaring
Utvikler, Acme · 2019 – 2021
`),
      ),
    ).toBe(false)
  })
})

describe('reading the export', () => {
  const parsed = parseCv(lines(EXPORT))

  it('reads the jobs the right way round', () => {
    // LinkedIn writes the employer above the role; everybody else does the
    // opposite, and read as written every job came out as a company with a
    // job title for an employer.
    expect(parsed.experience.map((job) => [job.role, job.organisation])).toEqual([
      ['Senior frontendutvikler', 'Nordvest Digital'],
      ['Frontendutvikler', 'Statens pensjonskasse'],
    ])
    expect(parsed.experience[0]).toMatchObject({ from: '2021-08', current: true })
    expect(parsed.experience[1]).toMatchObject({ from: '2018-01', to: '2021-07' })
  })

  it('takes the place under a job as its place, not as a bullet', () => {
    expect(parsed.experience[0]?.location).toBe('Oslo, Norway')
    expect(parsed.experience[0]?.bullets).toEqual(['Ledet et team på fire.'])
  })

  it('leaves the duration and the page footer out of the CV', () => {
    const everything = JSON.stringify(parsed)
    expect(everything).not.toContain('4 years')
    expect(everything).not.toContain('Page 1 of 2')
  })

  it('reads the degree, and where it was taken', () => {
    expect(parsed.education[0]).toMatchObject({
      role: 'Master i informatikk',
      organisation: 'Universitetet i Oslo',
    })
  })

  it('reads the contact details out of the sidebar', () => {
    expect(parsed.personalia.email).toBe('ola@example.no')
    expect(parsed.personalia.links.join(' ')).toContain('linkedin.com/in/olanordmann')
  })

  it('reads LinkedIn’s own words for a language level', () => {
    expect(parsed.languages).toEqual([
      { name: 'Norsk', level: 'native' },
      { name: 'Engelsk', level: 'c2' },
    ])
  })

  it('keeps the summary to itself', () => {
    expect(parsed.summary).toBe('Frontendutvikler med ti års erfaring fra finans.')
  })
})
