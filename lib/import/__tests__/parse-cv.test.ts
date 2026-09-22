import { describe, expect, it } from 'vitest'

import { findDateRange, HEADINGS, parseCv, type Line } from '@/lib/import/parse-cv'

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
    expect(parsed.skills.map((skill) => skill.name)).toContain('TypeScript')
    expect(parsed.skills.map((skill) => skill.name)).toContain('Tilgjengelighet (WCAG)')
    expect(parsed.languages.map((language) => language.name)).toEqual(['Norsk', 'Engelsk', 'Tysk'])
    expect(parsed.interests).toContain('Klatring')
  })
})

describe('what it refuses to guess', () => {
  it('hands back sections it has no home for, rather than dropping them', () => {
    const parsed = parseCv(
      lines(`
Militærtjeneste
Ingeniørbataljonen, Skjold leir · 2011
`),
    )
    expect(parsed.unrecognised.join(' ')).toContain('Skjold leir')
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
    expect(parsed.skills.map((skill) => skill.name)).toContain('TypeScript')
    expect(parsed.languages.map((language) => language.name)).toEqual(['Norsk', 'Engelsk'])
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
    expect(parsed.skills.map((skill) => skill.name)).toContain('Figma')
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

describe('dates as Norwegian CVs write them', () => {
  it('reads month and year with a full stop between', () => {
    // The most common format on a Norwegian CV, and one that was never found:
    // the full stops were stripped before matching, leaving "082019".
    expect(findDateRange('08.2019 – 06.2023')).toMatchObject({ from: '2019-08', to: '2023-06' })
    expect(findDateRange('08.2019–d.d.')).toMatchObject({ from: '2019-08', current: true })
  })

  it('keeps an entry whose dates are still a template’s placeholder', () => {
    expect(findDateRange('mm.åå – mm.åå Leksehjelp')).toMatchObject({
      from: '',
      to: '',
      rest: 'Leksehjelp',
    })
    expect(findDateRange('mm.åå–d.d.')).toMatchObject({ from: '', current: true })
  })

  it('looks past a word that sits in front of a year', () => {
    // "NTNU 2010" has the shape of "mai 2010". It is not a date, and the real
    // range starts one word later.
    expect(findDateRange('Master i bygg, NTNU 2010 – 2013')).toMatchObject({
      rest: 'Master i bygg, NTNU',
    })
  })
})

describe('jobs whose dates come under the title', () => {
  it('gives each job the title above its dates, not the next job’s', () => {
    // How most Word and Canva templates are set: title, employer, then a
    // small line of dates, then the description.
    const parsed = parseCv([
      { text: 'Erfaring', size: 18 },
      { text: 'Prosjektmedarbeider, Groruddalssatsingen', size: 9 },
      { text: 'Oslo kommune', size: 8 },
      { text: '08.2019 – 06.2021', size: 6 },
      { text: 'Utarbeide og holde presentasjoner.', size: 7 },
      { text: 'Deltidsstilling ved siden av studier.', size: 7 },
      { text: 'Redaktør, Zoon Politikon', size: 9 },
      { text: 'Universitetet i Oslo', size: 8 },
      { text: '01.2017 – 06.2019', size: 6 },
      { text: 'Tre utgivelser i semesteret.', size: 7 },
    ])

    expect(parsed.experience).toHaveLength(2)
    expect(parsed.experience[0]).toMatchObject({
      role: 'Prosjektmedarbeider, Groruddalssatsingen',
      organisation: 'Oslo kommune',
      from: '2019-08',
      bullets: ['Utarbeide og holde presentasjoner.', 'Deltidsstilling ved siden av studier.'],
    })
    expect(parsed.experience[1]).toMatchObject({
      role: 'Redaktør, Zoon Politikon',
      organisation: 'Universitetet i Oslo',
      bullets: ['Tre utgivelser i semesteret.'],
    })
  })

  it('manages without sizes, taking as many title lines as the first job had', () => {
    const parsed = parseCv(
      lines(`
Arbeidserfaring
Prosjektleder
Veidekke
08.2019 – nå
• Ledet bygging av ny skole
Byggeleder
Skanska
01.2014 – 07.2019
• Ansvar for HMS
`),
    )
    expect(parsed.experience.map((job) => [job.role, job.organisation, job.bullets])).toEqual([
      ['Prosjektleder', 'Veidekke', ['Ledet bygging av ny skole']],
      ['Byggeleder', 'Skanska', ['Ansvar for HMS']],
    ])
  })

  it('never takes a bullet for a title', () => {
    const parsed = parseCv(
      lines(`
Arbeidserfaring
Prosjektleder
08.2019 – nå
• Ledet bygging av ny skole
• Levert før frist
Byggeleder
01.2014 – 07.2019
`),
    )
    expect(parsed.experience[0]?.bullets).toEqual(['Ledet bygging av ny skole', 'Levert før frist'])
    expect(parsed.experience[1]?.role).toBe('Byggeleder')
  })

  it('joins a paragraph the page had wrapped', () => {
    const parsed = parseCv(
      lines(`
Arbeidserfaring
Utvikler · 2019 – 2021
Acme
Bygde en løsning som ble brukt av
alle kommunene i fylket.
`),
    )
    expect(parsed.experience[0]?.bullets).toEqual([
      'Bygde en løsning som ble brukt av alle kommunene i fylket.',
    ])
  })
})

describe('CVs with more than one experience heading', () => {
  it('keeps the jobs from every one of them', () => {
    const parsed = parseCv(
      lines(`
Relevant erfaring
Utvikler, Acme · 2019 – 2021
Annen erfaring
Butikkmedarbeider, Rema · 2015 – 2018
`),
    )
    expect(parsed.experience.map((job) => job.role)).toEqual(['Utvikler, Acme', 'Butikkmedarbeider, Rema'])
  })
})

describe('pages read in two columns', () => {
  it('does not carry a section across into the next column', () => {
    const parsed = parseCv([
      { text: 'Arbeidserfaring' },
      { text: 'Utvikler, Acme · 2019 – 2021' },
      { text: 'Resultatene mine', columnStart: true },
      { text: 'Økte salget med en tredjedel' },
    ])
    expect(parsed.experience[0]?.bullets).toEqual([])
    expect(parsed.unrecognised).toContain('Økte salget med en tredjedel')
  })

  it('keeps a quote under the languages out of the languages', () => {
    const parsed = parseCv([
      { text: 'Anders Nilsen', size: 48 },
      { text: 'Språk', size: 18 },
      { text: 'Norsk', size: 12 },
      { text: 'Engelsk', size: 12 },
      { text: 'Astrid Børresen', size: 11 },
      { text: '“Anders er en god lagspiller med øye for detaljer”', size: 11 },
    ])
    expect(parsed.languages.map((language) => language.name)).toEqual(['Norsk', 'Engelsk'])
    expect(parsed.unrecognised).toContain('Astrid Børresen')
  })
})

describe('the name, further down or in capitals', () => {
  it('writes a name set in capitals the way it is spelt', () => {
    const parsed = parseCv([{ text: 'ANNE-LISE ØSTBY HANSEN', size: 30 }])
    expect(parsed.personalia).toMatchObject({ firstName: 'Anne-Lise', lastName: 'Østby Hansen' })
  })

  it('finds the name after a sidebar, by its size', () => {
    const sidebar = Array.from({ length: 14 }, (_, index) => ({ text: `Ferdighet ${index}`, size: 9 }))
    const parsed = parseCv([...sidebar, { text: 'Kari Nordmann', size: 28 }])
    expect(parsed.personalia.firstName).toBe('Kari')
  })

  it('does not take a section heading for a name', () => {
    const parsed = parseCv([
      { text: 'Kari Nordmann', size: 20 },
      { text: 'Relevant erfaring', size: 22 },
    ])
    expect(parsed.personalia.firstName).toBe('Kari')
  })
})

describe('dates and headings that the layout broke apart', () => {
  it('puts back a closing year that wrapped onto the next line', () => {
    // A narrow column of dates wraps "jan. 2018 – jul. 2021", and the title
    // beside it keeps the rest of the line company.
    const parsed = parseCv(
      lines(`
Arbeidserfaring
jan. 2018 – jul. Frontendutvikler
2021
Statens pensjonskasse
• Bygde en selvbetjeningsløsning
`),
    )
    expect(parsed.experience).toHaveLength(1)
    expect(parsed.experience[0]).toMatchObject({
      role: 'Frontendutvikler',
      organisation: 'Statens pensjonskasse',
      from: '2018-01',
      to: '2021-07',
    })
  })

  it('recognises a heading the producer broke at the wrong places', () => {
    // Tracking does not always arrive one letter at a time: "A RBEIDSERFA
    // RING" is the same heading with the spaces in odd places.
    const parsed = parseCv(
      lines(`
A RBEIDSERFA RING
Utvikler, Acme · 2019 – 2021
`),
    )
    expect(parsed.experience).toHaveLength(1)
  })

  it('splits a letter-spaced heading off the line it shares', () => {
    const parsed = parseCv(lines('F E R D I G H E T E R TypeScript'))
    expect(parsed.skills.map((skill) => skill.name)).toEqual(['TypeScript'])
  })
})

describe('the words CVs actually use for their sections', () => {
  const underHeading = (heading: string) =>
    parseCv(
      lines(`
${heading}
Utvikler, Acme · 2019 – 2021
`),
    )

  it('reads the Norwegian names for work experience', () => {
    for (const heading of [
      'Arbeidshistorikk',
      'Arbeidsbakgrunn',
      'Yrkesbakgrunn',
      'Jobberfaring',
      'Tidligere stillinger',
      'Ansettelser',
      'Karrierehistorikk',
      'ARBEIDSERFARING',
    ]) {
      expect(underHeading(heading).experience, heading).toHaveLength(1)
    }
  })

  it('reads the English ones too', () => {
    for (const heading of ['Work history', 'Professional experience', 'Career history', 'Roles']) {
      expect(underHeading(heading).experience, heading).toHaveLength(1)
    }
  })

  it('knows the other sections by more than one name each', () => {
    const named = (heading: string, line: string) =>
      parseCv(lines(`${heading}\n${line}`))

    expect(named('Utdanningsbakgrunn', 'Master i informatikk, UiO · 2013 – 2015').education).toHaveLength(1)
    expect(named('Nøkkelferdigheter', 'TypeScript, React').skills.map((skill) => skill.name)).toContain('React')
    expect(named('Tekniske ferdigheter', 'TypeScript, React').skills.map((skill) => skill.name)).toContain('React')
    expect(named('Språkferdigheter', 'Norsk, Engelsk').languages.map((language) => language.name)).toEqual(['Norsk', 'Engelsk'])
    expect(named('Fritidsinteresser', 'Klatring, Langrenn').interests).toContain('Klatring')
    expect(named('Personlig profil', 'Utvikler med ti års erfaring.').summary).toContain('ti års')
  })

  it('gives every heading word exactly one section', () => {
    // A word in two lists would make which section it means depend on the
    // order of the table, which is nobody's idea of a rule.
    const seen = new Map<string, string>()
    for (const heading of HEADINGS) {
      for (const word of heading.words) {
        expect(seen.get(word), `"${word}" is also under ${seen.get(word)}`).toBeUndefined()
        seen.set(word, heading.type)
      }
    }
  })
})

describe('sections this app has a home for', () => {
  const NORWEGIAN_EXTRAS = `
Sertifiseringer
AWS Certified Solutions Architect · Amazon Web Services · nov. 2021
Certified Professional in Accessibility Core Competencies
IAAP

Kurs
Prosjektledelse, BI · 2022

Prosjekter
Klatreloggen, eget prosjekt · 2021 – 2022
• React Native-app for klatrere

Frivillig arbeid
Leksehjelp, Røde Kors · 2018 – 2020

Førerkort
Klasse B

Referanser
Kari Solberg, Utviklingssjef, Nordvest Digital · kari@example.no · +47 900 11 223
Referanser oppgis gjerne på forespørsel
`

  const parsed = parseCv(lines(NORWEGIAN_EXTRAS))

  it('reads certifications with their issuer and date', () => {
    expect(parsed.certifications[0]).toEqual({
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2021-11',
    })
    // The issuer on the line below the certification it belongs to.
    expect(parsed.certifications[1]).toMatchObject({
      name: 'Certified Professional in Accessibility Core Competencies',
      issuer: 'IAAP',
    })
  })

  it('reads courses, projects and volunteering as the entries they are', () => {
    expect(parsed.courses[0]).toMatchObject({ role: 'Prosjektledelse, BI' })
    expect(parsed.projects[0]).toMatchObject({
      role: 'Klatreloggen, eget prosjekt',
      bullets: ['React Native-app for klatrere'],
    })
    expect(parsed.volunteering[0]).toMatchObject({ role: 'Leksehjelp, Røde Kors' })
  })

  it('reads a referee, and leaves the standard sentence alone', () => {
    expect(parsed.references).toHaveLength(1)
    expect(parsed.references[0]).toMatchObject({
      name: 'Kari Solberg',
      role: 'Utviklingssjef',
      organisation: 'Nordvest Digital',
      email: 'kari@example.no',
    })
    expect(parsed.references[0]?.phone).toContain('900 11 223')
    expect(parsed.unrecognised.join(' ')).toContain('på forespørsel')
  })

  it('reads the licence classes', () => {
    expect(parsed.drivingLicence).toEqual(['B'])
  })

  it('does not read licence classes out of a sentence', () => {
    const prose = parseCv(
      lines(`
Førerkort
Jeg har hatt førerkort siden jeg var atten og kjører gjerne til kunder i hele fylket
`),
    )
    expect(prose.drivingLicence).toEqual([])
    expect(prose.unrecognised.join(' ')).toContain('atten')
  })

  it('reads the English names for the same sections', () => {
    const english = parseCv(
      lines(`
Certifications
AWS Certified Developer, Amazon, 2020

Volunteering
Mentor, Code Club · 2019 – 2021
`),
    )
    expect(english.certifications[0]?.name).toBe('AWS Certified Developer')
    expect(english.volunteering).toHaveLength(1)
  })
})

describe('how good somebody says they are', () => {
  it('reads a level written beside a skill', () => {
    const parsed = parseCv(
      lines(`
Ferdigheter
TypeScript (ekspert)
React – avansert
Figma: god
Rust
`),
    )
    expect(parsed.skills).toEqual([
      { name: 'TypeScript', level: 5 },
      { name: 'React', level: 4 },
      { name: 'Figma', level: 3 },
      { name: 'Rust' },
    ])
  })

  it('reads a language level, Norwegian or English', () => {
    const parsed = parseCv(
      lines(`
Språk
Norsk – morsmål
Engelsk (flytende)
Tysk: grunnleggende
Fransk
`),
    )
    expect(parsed.languages).toEqual([
      { name: 'Norsk', level: 'native' },
      { name: 'Engelsk', level: 'c2' },
      { name: 'Tysk', level: 'a2' },
      { name: 'Fransk' },
    ])
  })

  it('leaves a skill that merely has a dash in it alone', () => {
    // "Node.js - og Deno" is not a level, and inventing one would put a
    // rating on the CV that its owner never made.
    const parsed = parseCv(lines('Ferdigheter\nNode.js - og Deno'))
    expect(parsed.skills).toEqual([{ name: 'Node.js - og Deno' }])
  })
})

describe('the contact line', () => {
  it('takes the town and the country out of it', () => {
    const parsed = parseCv(lines('Ola Nordmann\nola@example.no · +47 900 11 223 · Oslo, Norge'))
    expect(parsed.personalia).toMatchObject({ city: 'Oslo', country: 'Norge' })
  })

  it('takes the town out of a street address, and leaves the street', () => {
    // An employer needs the town. The street is more than they need, and the
    // CV check tells people to leave it out.
    const parsed = parseCv(lines('Ola Nordmann\nandersn@gmail.com · Arupsgate 4, 0656 Oslo'))
    expect(parsed.personalia.city).toBe('Oslo')
  })

  it('does not take a town from a line that is not contact details', () => {
    // "Bekk Consulting · Oslo" under a job is where the job was.
    const parsed = parseCv(
      lines(`
Ola Nordmann
Arbeidserfaring
Utvikler · 2019 – 2021
Bekk Consulting · Oslo
`),
    )
    expect(parsed.personalia.city).toBe('')
  })
})
