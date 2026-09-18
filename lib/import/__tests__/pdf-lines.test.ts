import { describe, expect, it } from 'vitest'

import { pageToLines, type Fragment } from '@/lib/import/pdf-lines'

/**
 * Pages built by hand, in pdf.js coordinates: y grows upwards, so the top of
 * an A4 page is around 800.
 */

const WIDTH = 595

const text = (value: string, x: number, y: number, size = 9): Fragment => ({
  text: value,
  x,
  y,
  size,
  width: value.length * size * 0.5,
})

/**
 * A sidebar CV: name and contact details across the top, education and jobs
 * down the left, results and languages down the right. The two columns are
 * set independently, so their baselines rarely line up.
 */
function sidebarPage(): Fragment[] {
  const left = [
    'Utdanning',
    'Master i statsvitenskap',
    'Universitetet i Oslo',
    '08.2019 – 06.2021',
    'Erfaring',
    'Prosjektmedarbeider',
    'Oslo kommune',
    '08.2021 – 06.2023',
    'Leksehjelp',
    'Oslo Røde Kors',
  ].map((value, index) => text(value, 55, 640 - index * 23))

  const right = [
    'Resultater',
    '30 prosent høyere tilfredshet',
    'Språk',
    'Norsk',
    'Engelsk',
    'Spansk',
    'Referanser',
    'Oppgis på forespørsel',
  ].map((value, index) => text(value, 340, 632 - index * 29))

  return [
    text('Anders Nilsen', 200, 765, 40),
    text('anders@example.no', 204, 710, 8),
    text('123 45 678', 297, 710, 8),
    ...left,
    ...right,
  ]
}

describe('pages set in two columns', () => {
  it('reads the left column to the bottom before starting the right', () => {
    const lines = pageToLines({ width: WIDTH, fragments: sidebarPage() }).map((line) => line.text)

    // Interleaved by height, "Norsk" would land between two jobs.
    expect(lines.indexOf('Oslo Røde Kors')).toBeLessThan(lines.indexOf('Resultater'))
    expect(lines.slice(lines.indexOf('Resultater'))).toEqual([
      'Resultater',
      '30 prosent høyere tilfredshet',
      'Språk',
      'Norsk',
      'Engelsk',
      'Spansk',
      'Referanser',
      'Oppgis på forespørsel',
    ])
  })

  it('reads a line that runs across both columns first, and whole', () => {
    const lines = pageToLines({ width: WIDTH, fragments: sidebarPage() }).map((line) => line.text)
    expect(lines.slice(0, 3)).toEqual(['Anders Nilsen', 'anders@example.no 123 45 678', 'Utdanning'])
  })

  it('marks where each column begins', () => {
    const lines = pageToLines({ width: WIDTH, fragments: sidebarPage() })
    expect(lines.filter((line) => line.columnStart).map((line) => line.text)).toEqual([
      'Utdanning',
      'Resultater',
    ])
  })
})

describe('pages that only look like two columns', () => {
  it('keeps dates beside their jobs when both sides share a baseline', () => {
    // A narrow date column beside each entry, as this app's Register
    // template sets it. Reading the columns in turn would put every date
    // after every job.
    const fragments: Fragment[] = []
    for (let index = 0; index < 8; index += 1) {
      const y = 700 - index * 20
      fragments.push(text(`${2010 + index} – ${2011 + index}`, 40, y))
      fragments.push(text(`Stilling nummer ${index}`, 180, y))
    }

    const lines = pageToLines({ width: WIDTH, fragments }).map((line) => line.text)
    for (let index = 0; index < 8; index += 1) {
      const date = lines.indexOf(`${2010 + index} – ${2011 + index}`)
      expect(lines[date + 1]).toBe(`Stilling nummer ${index}`)
    }
  })

  it('keeps a column of section names beside the content', () => {
    // Headings set in a narrow column of their own, a few points off the
    // baseline of the first entry beside them - so not sharing it.
    const fragments: Fragment[] = []
    const headings = ['Erfaring', 'Utdanning', 'Kurs', 'Språk', 'Interesser']
    for (const [section, heading] of headings.entries()) {
      const top = 780 - section * 150
      fragments.push(text(heading, 57, top - 3, 10))
      for (let line = 0; line < 8; line += 1) {
        fragments.push(text(`${heading} linje ${line}`, 170, top - line * 14))
      }
    }

    const lines = pageToLines({ width: WIDTH, fragments }).map((line) => line.text)
    expect(lines.indexOf('Utdanning')).toBeGreaterThan(lines.indexOf('Erfaring linje 7'))
    expect(lines.indexOf('Utdanning')).toBeLessThan(lines.indexOf('Utdanning linje 1'))
  })

  it('leaves an ordinary one-column page in the order it was read', () => {
    const fragments = Array.from({ length: 12 }, (_, index) =>
      text('En helt vanlig linje med tekst som går over hele siden', 55, 700 - index * 14),
    )
    const lines = pageToLines({ width: WIDTH, fragments })
    expect(lines).toHaveLength(12)
    expect(lines.some((line) => line.columnStart)).toBe(false)
  })
})

describe('letter-spaced type', () => {
  it('joins characters set a little apart into one word', () => {
    const letters = 'ERFARING'.split('').map((letter, index) => ({
      text: letter,
      x: 55 + index * 12,
      y: 700,
      size: 14,
      width: 9,
    }))
    expect(pageToLines({ width: WIDTH, fragments: letters })[0]?.text).toBe('ERFARING')
  })
})

describe('pages of short lines', () => {
  it('does not take the blank paper beside them for a gutter', () => {
    // Nothing to the right of these lines, and a lot of empty page. With
    // the name across the top there are still rows on both sides of any
    // strip - but no column of text on the right.
    const fragments: Fragment[] = [text('Kari Nordmann Hansen Olsen Berg', 55, 780, 30)]
    for (let index = 0; index < 12; index += 1) {
      fragments.push(text('Kort linje', 55, 700 - index * 14))
    }
    const lines = pageToLines({ width: WIDTH, fragments })
    expect(lines.some((line) => line.columnStart)).toBe(false)
    expect(lines[0]?.text).toBe('Kari Nordmann Hansen Olsen Berg')
  })
})

describe('narrow columns', () => {
  it('finds the gutter between them, not the wider blank space beside them', () => {
    const fragments: Fragment[] = []
    for (let index = 0; index < 10; index += 1) {
      fragments.push(text(`Venstre ${index}`, 55, 700 - index * 14))
      fragments.push(text(`Høyre ${index}`, 200, 695 - index * 23))
    }
    const lines = pageToLines({ width: WIDTH, fragments }).map((line) => line.text)
    expect(lines.slice(0, 10)).toEqual(Array.from({ length: 10 }, (_, index) => `Venstre ${index}`))
  })
})

describe('a column of section names beside the content', () => {
  it('reads each heading before the entry it names', () => {
    // Bergen's shape: the heading sits a couple of points below the first
    // line beside it, so sorting by height alone puts every heading inside
    // the section above it.
    const fragments: Fragment[] = []
    const sections = ['Erfaring', 'Utdanning', 'Språk', 'Kurs', 'Interesser']
    for (const [index, heading] of sections.entries()) {
      const top = 780 - index * 150
      fragments.push(text(heading, 57, top - 3, 10))
      fragments.push(text(`${heading} første linje`, 170, top))
      for (let line = 1; line < 8; line += 1) {
        fragments.push(text(`${heading} linje ${line}`, 170, top - line * 14))
      }
    }

    const lines = pageToLines({ width: WIDTH, fragments }).map((line) => line.text)
    for (const heading of sections) {
      expect(lines.indexOf(heading)).toBeLessThan(lines.indexOf(`${heading} første linje`))
    }
    expect(lines.filter((line) => sections.includes(line))).toEqual(sections)
  })
})
