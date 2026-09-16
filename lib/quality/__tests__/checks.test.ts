import { describe, expect, it } from 'vitest'

import { checkDocument, sortFindings } from '@/lib/quality/checks'
import { createEmptyDocument } from '@/lib/schema/defaults'
import type { CvDocument, Section, TimelineEntry } from '@/lib/schema/cv'

let counter = 0
const blank = () => createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })

/** A document with enough in it that only the check under test fires. */
function sound(): CvDocument {
  const doc = blank()
  doc.personalia = {
    ...doc.personalia,
    firstName: 'Ola',
    lastName: 'Nordmann',
    title: 'Frontendutvikler',
    email: 'ola@example.no',
    phone: '+47 900 11 223',
    city: 'Oslo',
  }
  doc.sections = doc.sections.map((section) => {
    if (section.type === 'summary') {
      return {
        ...section,
        enabled: true,
        text: 'Frontendutvikler med ti års erfaring fra produktteam i finans og offentlig sektor. Bygger tilgjengelige grensesnitt i TypeScript og React, og trives best der design og utvikling møtes.',
      }
    }
    if (section.type === 'experience') {
      return {
        ...section,
        enabled: true,
        entries: [entry({ role: 'Utvikler', organisation: 'Acme', from: '2020-01', current: true })],
      }
    }
    return { ...section, enabled: false }
  })
  return doc
}

function entry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: `e-${++counter}`,
    role: '',
    organisation: '',
    location: '',
    from: '',
    to: '',
    current: false,
    descriptionMode: 'bullets',
    ...overrides,
  }
}

function withExperience(doc: CvDocument, entries: TimelineEntry[]): CvDocument {
  return {
    ...doc,
    sections: doc.sections.map((section) =>
      section.type === 'experience' ? ({ ...section, enabled: true, entries } as Section) : section,
    ),
  }
}

const ids = (doc: CvDocument, pages = 1) =>
  checkDocument(doc, { pages }).map((finding) => finding.id)

describe('a document with nothing wrong with it', () => {
  it('produces no findings', () => {
    expect(ids(sound())).toEqual([])
  })
})

describe('identity and contact', () => {
  it('catches a national identity number, wherever it is written', () => {
    const doc = sound()
    doc.sections = doc.sections.map((section) =>
      section.type === 'summary'
        ? { ...section, text: `${section.text} Fødselsnummer 15098012345.` }
        : section,
    )
    expect(ids(doc)).toContain('nationalId')
  })

  it('catches one written with a space after the date', () => {
    const doc = sound()
    doc.personalia = { ...doc.personalia, title: 'Utvikler 150980 12345' }
    expect(ids(doc)).toContain('nationalId')
  })

  it('does not mistake a phone number for one', () => {
    const doc = sound()
    doc.personalia = { ...doc.personalia, title: 'Utvikler 90011223' }
    expect(ids(doc)).not.toContain('nationalId')
  })

  it('reports a CV nobody can reply to', () => {
    const doc = sound()
    doc.personalia = { ...doc.personalia, email: '', phone: '' }
    expect(ids(doc)).toContain('noContact')
  })

  it('reports an email that cannot be one', () => {
    const doc = sound()
    doc.personalia = { ...doc.personalia, email: 'ola.example.no' }
    expect(ids(doc)).toContain('emailLooksWrong')
  })

  it('reports a link that is not a URL', () => {
    const doc = sound()
    doc.personalia = {
      ...doc.personalia,
      links: [{ id: 'l1', label: 'GitHub', url: 'github.com/ola' }],
    }
    expect(ids(doc)).toContain('linkNotAUrl')
  })

  it('accepts a real URL', () => {
    const doc = sound()
    doc.personalia = {
      ...doc.personalia,
      links: [{ id: 'l1', label: 'GitHub', url: 'https://github.com/ola' }],
    }
    expect(ids(doc)).not.toContain('linkNotAUrl')
  })
})

describe('dates', () => {
  it('reports an entry that ends before it starts', () => {
    const doc = withExperience(sound(), [
      entry({ role: 'Utvikler', organisation: 'Acme', from: '2022-01', to: '2020-01' }),
    ])
    expect(ids(doc)).toContain('entryEndsBeforeStart')
  })

  it('reports an entry with no dates at all', () => {
    const doc = withExperience(sound(), [entry({ role: 'Utvikler', organisation: 'Acme' })])
    expect(ids(doc)).toContain('entryNoDates')
  })

  it('ignores a blank entry, which is just a row nobody filled in', () => {
    const doc = withExperience(sound(), [entry()])
    expect(ids(doc)).not.toContain('entryNoDates')
  })

  it('reports a gap of a year or more', () => {
    const doc = withExperience(sound(), [
      entry({ role: 'Utvikler', organisation: 'A', from: '2015-01', to: '2017-01' }),
      entry({ role: 'Utvikler', organisation: 'B', from: '2019-06', to: '2021-01' }),
    ])
    expect(ids(doc)).toContain('gap')
  })

  it('does not report a gap of a couple of months', () => {
    const doc = withExperience(sound(), [
      entry({ role: 'Utvikler', organisation: 'A', from: '2015-01', to: '2017-01' }),
      entry({ role: 'Utvikler', organisation: 'B', from: '2017-04', to: '2021-01' }),
    ])
    expect(ids(doc)).not.toContain('gap')
  })

  it('does not report a gap for overlapping jobs', () => {
    const doc = withExperience(sound(), [
      entry({ role: 'Utvikler', organisation: 'A', from: '2015-01', to: '2021-01' }),
      entry({ role: 'Rådgiver', organisation: 'B', from: '2016-01', to: '2017-01' }),
    ])
    expect(ids(doc)).not.toContain('gap')
  })
})

describe('writing', () => {
  it('reports an entry with too many bullets', () => {
    const doc = withExperience(sound(), [
      entry({
        role: 'Utvikler',
        organisation: 'Acme',
        from: '2020-01',
        current: true,
        description: Array.from({ length: 8 }, (_, i) => `Punkt ${i}`).join('\n'),
      }),
    ])
    expect(ids(doc)).toContain('tooManyBullets')
  })

  it('reports a summary nobody will finish', () => {
    const doc = sound()
    doc.sections = doc.sections.map((section) =>
      section.type === 'summary' ? { ...section, text: 'x'.repeat(800) } : section,
    )
    expect(ids(doc)).toContain('summaryLong')
  })
})

describe('length', () => {
  it('reports a CV over two pages', () => {
    expect(ids(sound(), 3)).toContain('tooLong')
    expect(ids(sound(), 2)).not.toContain('tooLong')
  })
})

describe('ordering', () => {
  it('puts what will cost you the job first', () => {
    // By severity, not alphabetically: a lexical sort would put info above
    // warning, which is the wrong way round for advice.
    const rank = { error: 0, warning: 1, info: 2 }
    const sorted = sortFindings(checkDocument(blank(), { pages: 1 }))
    const ranks = sorted.map((finding) => rank[finding.severity])

    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(sorted[0]?.severity).toBe('error')
  })
})
