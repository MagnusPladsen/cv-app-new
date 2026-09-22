import { isLinkedInExport, normaliseLinkedIn } from './linkedin'

/**
 * Turning somebody else's CV into the beginnings of one of ours.
 *
 * The rule throughout is to claim only what is unambiguous and hand the rest
 * back. An import that quietly mangles a job history is worse than one that
 * says "here are the four things I recognised, the rest is below" - the first
 * has to be found and undone, the second only has to be finished.
 *
 * Pure on purpose: the only input is lines of text with their type size, so
 * the whole thing is testable without a PDF, a browser or a file.
 */

export type Line = {
  text: string
  /** Point size, where the extractor knows it. Headings are usually larger. */
  size?: number
  bold?: boolean
  /**
   * The first line of a column on a page set in two. Whatever section the
   * previous column ended in does not continue here.
   */
  columnStart?: boolean
}

export type ParsedEntry = {
  role: string
  organisation: string
  /** Where the job was, when the CV gave a place of its own. */
  location: string
  /** "YYYY-MM", or "" when the CV only gave a year or nothing. */
  from: string
  to: string
  current: boolean
  bullets: string[]
}

export type ParsedSkill = {
  name: string
  /** 1-5, where the CV said how good somebody is. */
  level?: 1 | 2 | 3 | 4 | 5
}

export type ParsedLanguage = {
  name: string
  level?: 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'native'
}

export type ParsedCert = {
  name: string
  issuer: string
  /** "YYYY-MM", or "" when only a year was given. */
  date: string
}

export type ParsedReference = {
  name: string
  role: string
  organisation: string
  email: string
  phone: string
}

export type ParsedCv = {
  personalia: {
    firstName: string
    lastName: string
    title: string
    email: string
    phone: string
    /** Postal town, where a contact line gave one. */
    city: string
    country: string
    links: string[]
  }
  summary: string
  experience: ParsedEntry[]
  education: ParsedEntry[]
  skills: ParsedSkill[]
  languages: ParsedLanguage[]
  interests: string[]
  /** Sections this app has a home for, kept in their own shape. */
  certifications: ParsedCert[]
  courses: ParsedEntry[]
  projects: ParsedEntry[]
  volunteering: ParsedEntry[]
  references: ParsedReference[]
  /** Licence classes, as "B", "BE", "C1".  */
  drivingLicence: string[]
  /** Everything not claimed, in order, so nothing is silently dropped. */
  unrecognised: string[]
}

/** Section headings, as they are actually written on Norwegian CVs. */
/** Section names as CVs actually write them, Norwegian and English. */
export const HEADINGS: { type: keyof typeof SECTION_KEYS; words: string[] }[] = [
  {
    type: 'summary',
    words: [
      'om meg',
      'om deg',
      'om meg selv',
      'min profil',
      'personlig profil',
      'profil',
      'presentasjon',
      'introduksjon',
      'kort om meg',
      'kort fortalt',
      'sammendrag',
      'oppsummering',
      'nøkkelkvalifikasjoner',
      'hovedkvalifikasjoner',
      'karrieremål',
      'yrkesmål',
      'målsetting',
      'summary',
      'professional summary',
      'career summary',
      'profile',
      'personal profile',
      'professional profile',
      'about me',
      'about',
      'introduction',
      'overview',
      'objective',
      'career objective',
      'personal statement',
    ],
  },
  {
    type: 'experience',
    words: [
      'arbeidserfaring',
      'arbeidserfaringer',
      'arbeidshistorikk',
      'arbeidsbakgrunn',
      'arbeidsliv',
      'arbeidsforhold',
      'arbeidspraksis',
      'arbeid',
      'erfaring',
      'erfaringer',
      'relevant erfaring',
      'annen erfaring',
      'relevant arbeidserfaring',
      'annen arbeidserfaring',
      'yrkeserfaring',
      'yrkeserfaringer',
      'yrkesbakgrunn',
      'jobberfaring',
      'jobb',
      'jobber',
      'tidligere jobber',
      'stillinger',
      'tidligere stillinger',
      'tidligere arbeidsgivere',
      'ansettelser',
      'praksis',
      'praksisplass',
      'karriere',
      'karrierehistorikk',
      'experience',
      'work experience',
      'work history',
      'work',
      'professional experience',
      'relevant experience',
      'other experience',
      'employment',
      'employment history',
      'employment experience',
      'career',
      'career history',
      'positions',
      'roles',
    ],
  },
  {
    type: 'education',
    words: [
      'utdanning',
      'utdanninger',
      'utdannelse',
      'utdanningsbakgrunn',
      'utdanningshistorikk',
      'akademisk bakgrunn',
      'akademisk',
      'skolegang',
      'skolebakgrunn',
      'skole',
      'studier',
      'høyere utdanning',
      'videregående',
      'grader',
      'eksamener',
      'education',
      'education and training',
      'educational background',
      'academic background',
      'academics',
      'studies',
      'schooling',
      'degrees',
      'qualifications',
      'academic qualifications',
    ],
  },
  {
    type: 'skills',
    words: [
      'ferdigheter',
      'nøkkelferdigheter',
      'ferdigheter og kompetanse',
      'kompetanse',
      'nøkkelkompetanse',
      'spesialkompetanse',
      'fagkompetanse',
      'faglige ferdigheter',
      'tekniske ferdigheter',
      'digitale ferdigheter',
      'it-ferdigheter',
      'it-kunnskaper',
      'it-kompetanse',
      'datakunnskaper',
      'dataferdigheter',
      'kvalifikasjoner',
      'verktøy',
      'teknologier',
      'styrker',
      'egenskaper',
      'personlige egenskaper',
      'skills',
      'key skills',
      'core skills',
      'technical skills',
      'core competencies',
      'competencies',
      'expertise',
      'strengths',
      'tools',
      'technologies',
      'tech stack',
      'proficiencies',
      'abilities',
    ],
  },
  {
    type: 'languages',
    words: [
      'språk',
      'språkkunnskaper',
      'språkferdigheter',
      'språkkompetanse',
      'fremmedspråk',
      'languages',
      'language skills',
      'language proficiency',
      'spoken languages',
    ],
  },
  {
    type: 'certifications',
    words: [
      'sertifisering',
      'sertifiseringer',
      'sertifikater',
      'kursbevis',
      'lisenser',
      'autorisasjoner',
      'certifications',
      'certification',
      'certificates',
      'licences',
      'licenses',
      'credentials',
    ],
  },
  {
    type: 'courses',
    words: [
      'kurs',
      'kurs og sertifiseringer',
      'etterutdanning',
      'opplæring',
      'videreutdanning',
      'courses',
      'training',
      'professional development',
    ],
  },
  {
    type: 'projects',
    words: [
      'prosjekter',
      'prosjekt',
      'portefølje',
      'egne prosjekter',
      'projects',
      'project work',
      'portfolio',
      'side projects',
    ],
  },
  {
    type: 'volunteering',
    words: [
      'frivillig arbeid',
      'frivillig erfaring',
      'frivillige verv',
      'frivillighet',
      'verv',
      'tillitsverv',
      'organisasjonserfaring',
      'volunteering',
      'volunteer experience',
      'voluntary work',
      'community work',
    ],
  },
  {
    type: 'references',
    words: [
      'referanser',
      'referanse',
      'anbefalinger',
      'references',
      'recommendations',
      'referees',
    ],
  },
  {
    type: 'drivingLicence',
    words: [
      'førerkort',
      'førerkortklasser',
      'driving licence',
      'driving license',
      'drivers licence',
      'driver’s license',
    ],
  },
  {
    type: 'interests',
    words: [
      'interesser',
      'personlige interesser',
      'fritidsinteresser',
      'fritidsaktiviteter',
      'fritid',
      'på fritiden',
      'hobbyer',
      'hobby',
      'aktiviteter',
      'interests',
      'hobbies',
      'hobbies and interests',
      'activities',
      'pastimes',
    ],
  },
  {
    type: 'other',
    words: [
      'militærtjeneste',
      'førstegangstjeneste',
      'publikasjoner',
      'publiseringer',
      'priser',
      'utmerkelser',
      'presentasjoner',
      'medlemskap',
      'vedlegg',
      'resultater',
      'nøkkelresultater',
      'prestasjoner',
      'military service',
      'publications',
      'presentations',
      'memberships',
      'affiliations',
      'awards',
      'honours',
      'honors',
      'achievements',
      'key achievements',
      'patents',
    ],
  },
]

const SECTION_KEYS = {
  summary: true,
  experience: true,
  education: true,
  skills: true,
  languages: true,
  certifications: true,
  courses: true,
  projects: true,
  volunteering: true,
  references: true,
  drivingLicence: true,
  interests: true,
  other: true,
} as const

type SectionType = keyof typeof SECTION_KEYS

// prettier-ignore
const MONTHS: Record<string, number> = {
  januar: 1, jan: 1, january: 1,
  februar: 2, feb: 2, february: 2,
  mars: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mai: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12, december: 12,
}

/** Words a CV uses for "and still there". */
const PRESENT = /^(nå|no|na|d\.?d\.?|dags dato|pågående|i dag|present|current|now|today|ongoing)$/i

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[:•·|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** A heading if it names a section and is short enough to be one. */
function headingType(line: Line): SectionType | null {
  // "Referanser (2-4)", "Interesser (valgfritt)": a note in brackets is not
  // part of the name.
  const text = normalise(line.text.replace(/\s*\([^)]*\)\s*$/, ''))
  if (!text || text.length > 40) return null

  // Tracking a heading spreads it out, and a PDF records that as real
  // spaces - "OM MEG" as "O M M E G", or, where the producer only broke it
  // at some pairs, "A RBEIDSERFA RING". Comparing with every space removed
  // catches both, and a line this short that spells a section name with its
  // spaces taken out is that section name.
  const squashed = text.replace(/\s+/g, '')

  for (const heading of HEADINGS) {
    if (heading.words.includes(text)) return heading.type
    if (heading.words.some((word) => word.replace(/\s+/g, '') === squashed)) return heading.type
  }
  return null
}

/** "mai 2021" / "05/2021" / "2021" as "YYYY-MM", or "" for a bare year. */
/**
 * "mm.åå", "MM/YYYY": a template's placeholder the writer never replaced. It
 * still marks where an entry's dates go, so the entry is kept with them blank.
 */
const PLACEHOLDER_DATE = String.raw`mm[./-](?:åå|åååå|yy|yyyy)`

function monthToken(raw: string): string | null {
  if (new RegExp(`^${PLACEHOLDER_DATE}$`, 'i').test(raw.trim())) return ''
  // Only the full stop that ends an abbreviated month goes. Stripping every
  // dot turned "08.2019", the most common way to write a date on a Norwegian
  // CV, into "082019", and no date written that way was ever found.
  const text = raw
    .toLowerCase()
    .replace(/([a-zæøå])\./g, '$1')
    .trim()

  const named = /^([a-zæøå]+)\s+(\d{4})$/.exec(text)
  if (named && MONTHS[named[1]!]) {
    return `${named[2]}-${String(MONTHS[named[1]!]).padStart(2, '0')}`
  }

  const numeric = /^(\d{1,2})[/.-](\d{4})$/.exec(text)
  if (numeric) {
    const month = Number(numeric[1])
    if (month >= 1 && month <= 12) return `${numeric[2]}-${String(month).padStart(2, '0')}`
  }

  const year = /^(\d{4})$/.exec(text)
  // A year with no month is real information, but not a date this app can
  // store - it keeps "YYYY-MM". Treated as found-but-empty rather than as no
  // date at all, so the entry is still created.
  if (year && Number(year[1]) > 1950 && Number(year[1]) < 2100) return ''

  return null
}

export type DateRange = { from: string; to: string; current: boolean; rest: string }

/** Finds a date range anywhere in a line, and returns what is left of it. */
export function findDateRange(text: string): DateRange | null {
  const separator = /\s*(?:–|—|-|til|to|until)\s*/i
  const datePart = String.raw`(?:${PLACEHOLDER_DATE}|[A-Za-zæøåÆØÅ]+\.?\s+\d{4}|\d{1,2}[/.\-]\d{4}|\d{4})`
  const pattern = new RegExp(
    `(${datePart})${separator.source}(${datePart}|nå|no|na|d\\.?d\\.?|i dag|present|current|now|ongoing|pågående)`,
    'gi',
  )

  // A word before a year looks like a month to the pattern: in "NTNU 2010 –
  // 2013" the first candidate is "NTNU 2010". When a candidate is not a date,
  // try again one character on rather than giving up on the line.
  let match: RegExpExecArray | null = null
  let from: string | null = null
  while ((match = pattern.exec(text))) {
    from = monthToken(match[1]!)
    if (from !== null) break
    pattern.lastIndex = match.index + 1
  }
  if (!match || from === null) return null

  const tail = match[2]!.trim()
  const current = PRESENT.test(tail.replace(/\./g, ''))
  const to = current ? '' : (monthToken(tail) ?? '')

  return {
    from,
    to,
    current,
    rest: (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length))
      // "Master i informatikk · (2013 - 2015)" leaves "( )" behind.
      .replace(/\(\s*\)/g, '')
      .replace(/\s*[|·•,–—-]\s*$/, '')
      .replace(/^\s*[|·•,–—-]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim(),
  }
}

const BULLET = /^\s*[•·▪◦*–—◆◇■□●○►▸✓✔-]\s+/

/**
 * A date range whose closing year wrapped onto the line below: "jan. 2018 -
 * jul." with "2021" underneath, which a narrow column of dates produces. The
 * month may be followed by the job title on the same line, so the year is put
 * back where it belongs rather than appended.
 */
const HALF_RANGE =
  /((?:\d{4}|nå)\s*(?:–|—|-|til|to|until)\s*(?:[A-Za-zæøåÆØÅ]{3,}\.?|\d{1,2}[/.\-]))(?=\s|$)/i


/**
 * The town somebody lives in, out of a contact line.
 *
 * Norwegian CVs write it as part of a run of details - "ola@example.no · +47
 * 900 11 223 · Oslo, Norge" - or as a street address with a postcode. Only
 * the town is taken: a street address is more than an employer needs, and the
 * quality check tells people to leave it out.
 */
const COUNTRIES = /^(norge|noreg|norway|sverige|sweden|danmark|denmark|finland|island|iceland)$/i

function findPlace(text: string): { city: string; country: string } | null {
  // "0656 Oslo": a postcode and the town after it.
  const postcode = /\b(\d{4})\s+([A-ZÆØÅ][a-zæøåA-ZÆØÅ.-]+(?:\s+[A-ZÆØÅ][a-zæøå.-]+)?)\b/.exec(text)
  if (postcode) return { city: postcode[2]!.trim(), country: '' }

  for (const part of text.split(/\s*[·|•]\s*/)) {
    const pieces = part.split(',').map((piece) => piece.trim())
    const country = pieces.find((piece) => COUNTRIES.test(piece))
    const city = pieces.find(
      (piece) =>
        piece !== country &&
        /^[A-ZÆØÅ][a-zæøå]+(?:[ -][A-ZÆØÅ]?[a-zæøå]+)?$/.test(piece) &&
        piece.split(/\s+/).length <= 2,
    )
    if (country && city) return { city, country }
    if (country && !city) return { city: '', country }
    // A lone town only counts beside other contact details, never on its own
    // line, where it is as likely to be an employer.
    if (city && pieces.length === 1 && /@|\d{6,}|\+\d/.test(text)) {
      return { city, country: '' }
    }
  }
  return null
}

/** A line that is nothing but a bullet: the glyph was set apart from its text. */
const LONE_BULLET = /^[•·▪◦*–—◆◇■□●○►▸✓✔-]$/

/**
 * Splits "ARBEIDSERFARING Senior utvikler" into its heading and the rest.
 *
 * Templates that set section names in a column of their own, beside the
 * content, put the heading on the same baseline as the first entry, and the
 * two come out as one line. Only a heading in capitals is split off, so that
 * "Erfaring med React" stays a sentence - and a letter-spaced one counts,
 * since tracking arrives as one word per letter.
 */
function splitHeading(line: Line): Line[] {
  const words = line.text.split(' ')
  // Up to fifteen, because a letter-spaced heading is one word per letter:
  // "F E R D I G H E T E R TypeScript" is a heading and a skill on one line.
  for (let count = Math.min(15, words.length - 1); count >= 1; count -= 1) {
    const head = words.slice(0, count).join(' ')
    // Two letters, wherever the spaces fall: a letter-spaced heading has
    // none of them next to each other.
    if (head !== head.toUpperCase() || head.replace(/[^\p{L}]/gu, '').length < 2) continue
    if (!headingType({ text: head })) continue
    return [
      { ...line, text: head },
      { ...line, text: words.slice(count).join(' '), columnStart: false },
    ]
  }
  return [line]
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/

/**
 * A phone number, counted rather than pattern-matched.
 *
 * Norwegian numbers are written every way a person can think of - 900 11 223,
 * 90 01 12 23, 90011223, +47 900 11 223 - so a grouping pattern catches one
 * style and misses the rest. Counting digits catches all of them, and the
 * length check is what stops "240 000 medlemmer" being read as a phone number.
 */
const PHONE_CANDIDATE = /\+?\d[\d\s-]{6,16}\d/g

const YEAR_RANGE = /^(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}$/

function findPhone(text: string): string | null {
  for (const match of text.match(PHONE_CANDIDATE) ?? []) {
    // "2013 - 2015" is eight digits and a dash, and is not a number to ring.
    if (YEAR_RANGE.test(match.trim())) continue
    const digits = match.replace(/\D/g, '')
    const national = digits.startsWith('47') ? digits.slice(2) : digits
    // Eight digits is a Norwegian number; the wider range covers the rest of
    // the world, but only when the number announced itself with a +.
    if (national.length === 8) return match.trim()
    if (match.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) {
      return match.trim()
    }
  }
  return null
}
const URL = /\b(?:https?:\/\/|www\.)[^\s,;]+|(?:github\.com|linkedin\.com)\/[^\s,;]+/gi


/** How a CV writes "how good are you at this", and what it means as 1-5. */
const SKILL_LEVELS: [RegExp, 1 | 2 | 3 | 4 | 5][] = [
  [/^(nybegynner|grunnleggende|basic|beginner|novice|elementary)$/i, 1],
  [/^(litt|noe|some|limited|working knowledge)$/i, 2],
  [/^(god|middels|intermediate|competent|proficient|comfortable)$/i, 3],
  [/^(veldig god|avansert|advanced|strong|erfaren|experienced)$/i, 4],
  [/^(ekspert|expert|spesialist|specialist|master|svært god)$/i, 5],
]

const LANGUAGE_LEVELS: [RegExp, 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'native'][] = [
  [/^(morsmål|morsmaal|native|native speaker|modersmål|native or bilingual)$/i, 'native'],
  [/^(flytende|fluent|svært god|meget god|c2|full professional)$/i, 'c2'],
  [/^(veldig god|avansert|advanced|c1|professional working)$/i, 'c1'],
  [/^(god|b2|profesjonell|professional)$/i, 'b2'],
  [/^(middels|intermediate|b1|limited working)$/i, 'b1'],
  [/^(litt|noe|basic|grunnleggende|a2)$/i, 'a2'],
  [/^(nybegynner|beginner|a1|elementary)$/i, 'a1'],
]

/**
 * Splits "React (avansert)", "Norsk - morsmål", "Engelsk: flytende" into the
 * thing and how well. A level the CV did not give stays undefined rather than
 * being guessed at: an invented "middels" is worse than no rating.
 */
function splitLevel<T>(item: string, levels: [RegExp, T][]): { name: string; level?: T } {
  const match = /^(.*?)\s*(?:[([]\s*([^)\]]+?)\s*[)\]]|[-–—:]\s*(.+))$/.exec(item.trim())
  if (!match) return { name: item.trim() }

  const name = match[1]!.trim()
  const rest = (match[2] ?? match[3] ?? '').trim()
  if (!name || !rest) return { name: item.trim() }

  for (const [pattern, level] of levels) {
    if (pattern.test(rest)) return { name, level }
  }
  return { name: item.trim() }
}

/** Splits a list written on one line: "React, Node.js · Figma". */
function splitList(text: string): string[] {
  return text
    .split(/[,;•·|]|\s{3,}/)
    .map((part) => part.replace(BULLET, '').trim())
    .filter((part) => part.length > 1 && part.length < 60)
}

/**
 * Joins the lines of a wrapped paragraph back together. A line that starts in
 * lower case continues the one before it; anything else - a capital, a digit,
 * a bullet - starts something new.
 */
function unwrap(lines: string[]): string[] {
  const joined: string[] = []
  for (const line of lines) {
    const previous = joined[joined.length - 1]
    if (previous !== undefined && /^\p{Ll}/u.test(line) && !/[.!?]$/.test(previous)) {
      joined[joined.length - 1] = `${previous} ${line}`
    } else {
      joined.push(line)
    }
  }
  return joined
}

/** The size most of a block is set in, which is the size of its body text. */
function bodySize(lines: Line[]): number | undefined {
  const counts = new Map<number, number>()
  for (const line of lines) {
    if (line.size === undefined) continue
    const size = Math.round(line.size * 2) / 2
    counts.set(size, (counts.get(size) ?? 0) + 1)
  }
  let body: number | undefined
  let most = 0
  for (const [size, count] of counts) {
    if (count > most) {
      body = size
      most = count
    }
  }
  return body
}


/** "Oslo", "Oslo, Norway", "Bergen kommune": short, capitalised, no verb. */
const PLACE_LINE = /^[A-ZÆØÅ][a-zæøå.-]+(?:[ -][A-ZÆØÅa-zæøå.-]+){0,2}(?:,\s*[A-ZÆØÅ][a-zæøå.-]+)?$/

/** Entries for a block whose dates are single, not ranges. */
function fromSingleDates(lines: { text: string }[]): {
  entries: ParsedEntry[]
  leftovers: string[]
} {
  const entries: ParsedEntry[] = []
  const leftovers: string[] = []

  for (const line of lines) {
    const text = line.text
    const dated = findSingleDate(text)
    const current = entries[entries.length - 1]

    if (!dated || !dated.rest) {
      if (BULLET.test(text) && current) current.bullets.push(text.replace(BULLET, '').trim())
      else if (current && !current.organisation) current.organisation = text
      else leftovers.push(text)
      continue
    }

    entries.push({
      role: dated.rest,
      organisation: '',
      location: '',
      from: dated.date,
      to: '',
      current: false,
      bullets: [],
    })
  }

  return { entries, leftovers }
}

/**
 * Turns a block of lines into jobs or degrees, keyed on the date ranges.
 *
 * CVs put the dates in one of two places, and a block is read one way or the
 * other depending on which it is:
 *
 * - **Dates first**, on the job's own line or just above it. The lines after
 *   the date are the role, the employer, then the description.
 * - **Dates under the title**, which is how most Word and Canva templates are
 *   set: role, employer, then a small line of dates. Read the first way, every
 *   job would take the next job's title as its last bullet. Here the lines
 *   just above each date belong to it - the ones set larger than the body
 *   text when sizes are known, otherwise as many as preceded the first date.
 */
function buildEntries(block: Line[]): { entries: ParsedEntry[]; leftovers: string[] } {
  const lines = block.map((line) => ({ ...line, range: findDateRange(line.text) }))
  const dated = lines.flatMap((line, index) => (line.range ? [index] : []))
  const first = dated[0]

  // Nothing in this block is a range. A course or a project is often dated
  // with a single year - "Prosjektledelse, BI · 2022" - so each line that
  // carries one date becomes an entry that started then.
  if (first === undefined) return fromSingleDates(lines)

  const entries: ParsedEntry[] = []
  const leftovers: string[] = []

  // "Redaktør · Universitetet i Oslo" beside the date is role and employer,
  // as separate cells of a table row or separate boxes come out.
  const newEntry = (range: DateRange): ParsedEntry => {
    const [role = '', ...organisation] = range.rest.split(' · ')
    return {
      role,
      organisation: organisation.join(' · '),
      location: '',
      from: range.from,
      to: range.to,
      current: range.current,
      bullets: [],
    }
  }

  // Fills an entry's empty fields from a run of lines, then the description.
  const fill = (entry: ParsedEntry, run: string[]) => {
    const description: string[] = []
    for (const line of run) {
      if (BULLET.test(line)) description.push(line.replace(BULLET, '').trim())
      else if (!entry.role) entry.role = line
      else if (!entry.organisation) entry.organisation = line
      // "Oslo, Norway" under a job is where the job was, not a bullet about
      // it. LinkedIn writes one under every entry.
      else if (!entry.location && PLACE_LINE.test(line)) entry.location = line
      else description.push(line)
    }
    entry.bullets.push(...unwrap(description))
  }

  const titleFirst = lines.slice(0, first).some((line) => !BULLET.test(line.text))

  if (!titleFirst) {
    // Dates first: everything between two dates belongs to the first, and
    // stray bullets above the first date to nobody.
    leftovers.push(...lines.slice(0, first).map((line) => line.text))
    for (const [position, index] of dated.entries()) {
      const entry = newEntry(lines[index]!.range!)
      const end = dated[position + 1] ?? lines.length
      fill(entry, lines.slice(index + 1, end).map((line) => line.text))
      entries.push(entry)
    }
    return { entries, leftovers }
  }

  const body = bodySize(lines)
  const leading = first

  for (const [position, index] of dated.entries()) {
    const start = position === 0 ? 0 : dated[position - 1]! + 1
    const before = lines.slice(start, index)

    // How many of the lines above this date are its title.
    let take: number
    if (body !== undefined && before.every((line) => line.size !== undefined)) {
      take = 0
      for (let i = before.length - 1; i >= 0 && before[i]!.size! > body; i -= 1) take += 1
      // Titles set in bold at body size, as Word documents mostly are, are
      // not told apart by size at all.
      if (take === 0) take = Math.min(leading, before.length)
    } else {
      take = Math.min(leading, before.length)
    }
    take = Math.min(take, 3)
    // A title is what directly precedes the date, and a bullet is
    // description, never a title.
    let plain = 0
    while (plain < before.length && !BULLET.test(before[before.length - 1 - plain]!.text)) plain += 1
    take = Math.min(take, plain)

    const spill = before.slice(0, before.length - take).map((line) => line.text)
    const title = before.slice(before.length - take).map((line) => line.text)

    const previous = entries[entries.length - 1]
    if (previous) fill(previous, spill)
    else leftovers.push(...spill)

    const range = lines[index]!.range!
    let entry = newEntry({ ...range, rest: '' })
    fill(entry, title)
    // What shared the date's line - "Gj.snittskarakter:", a place - is kept
    // as description rather than lost.
    if (range.rest) {
      if (!entry.role) entry = { ...newEntry(range), bullets: entry.bullets }
      else if (title.length === 1 && !entry.organisation) {
        // "Universitetet i Oslo" above "Master i informatikk · 2013 - 2015":
        // what shares the date's line is the thing, and the line above it is
        // where it happened.
        entry.organisation = entry.role
        entry.role = range.rest
      } else entry.bullets.push(range.rest)
    }
    entries.push(entry)
  }

  const last = entries[entries.length - 1]!
  fill(last, lines.slice(dated[dated.length - 1]! + 1).map((line) => line.text))

  return { entries, leftovers }
}


/** A single date in a line - "mai 2023", "05.2023", "2023" - and what is left. */
function findSingleDate(text: string): { date: string; rest: string } | null {
  const pattern = /([A-Za-zæøåÆØÅ]+\.?\s+\d{4}|\d{1,2}[/.\-]\d{4}|\b\d{4}\b)/g
  let match: RegExpExecArray | null = null
  while ((match = pattern.exec(text))) {
    const date = monthToken(match[1]!)
    if (date === null) continue
    const rest = (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length))
      .replace(/\s*[|·•,–—-]\s*$/, '')
      .replace(/^\s*[|·•,–—-]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
    return { date, rest }
  }
  return null
}

/**
 * Certifications, which a CV writes as a name, an issuer and a date in
 * whatever order it likes - sometimes on one line, sometimes with the issuer
 * underneath. A line carrying a date starts a certification; a plain line
 * after it is the issuer it was still missing.
 */
function buildCertifications(lines: string[]): ParsedCert[] {
  const certifications: ParsedCert[] = []

  for (const line of lines) {
    const text = line.replace(BULLET, '').trim()
    if (!text) continue

    const dated = findSingleDate(text)
    const previous = certifications[certifications.length - 1]

    if (!dated) {
      // No date: the issuer of the one above, or a certification whose date
      // the CV never gave.
      if (previous && !previous.issuer) previous.issuer = text
      else certifications.push({ name: text, issuer: '', date: '' })
      continue
    }

    const [name = '', ...issuer] = dated.rest.split(/\s*[·|]\s*|\s*,\s*/)
    certifications.push({ name: name || dated.rest, issuer: issuer.join(', '), date: dated.date })
  }

  return certifications.filter((certification) => certification.name)
}

/**
 * Referees. The contact details are what make one findable, so a line with an
 * address or a number is what starts one; the rest of the line, and the line
 * above it, are the name, the role and where they work.
 */
function buildReferences(lines: string[]): {
  references: ParsedReference[]
  leftovers: string[]
} {
  const references: ParsedReference[] = []
  const leftovers: string[] = []
  let pending: string[] = []

  for (const line of lines) {
    const text = line.replace(BULLET, '').trim()
    if (!text) continue

    const email = EMAIL.exec(text)?.[0] ?? ''
    const phone = findPhone(text) ?? ''
    if (!email && !phone) {
      pending.push(text)
      continue
    }

    const parts = [...pending, text.replace(email, '').replace(phone, '')]
      .join(' · ')
      .split(/\s*[·|]\s*|\s*,\s*/)
      .map((part) => part.replace(/^(tlf\.?|telefon|e-?post|mail|epost)\s*:?\s*/i, '').trim())
      .filter(Boolean)

    const [name = '', role = '', ...organisation] = parts
    references.push({
      name,
      role,
      organisation: organisation.join(', '),
      email,
      phone,
    })
    pending = []
  }

  // "Referanser oppgis på forespørsel" and anything else with nobody in it.
  leftovers.push(...pending)
  return { references, leftovers }
}

/** The classes a Norwegian licence is written in: B, BE, C1, T. */
function licenceClasses(text: string): string[] {
  const found = text.toUpperCase().match(/\b(?:AM|A1|A2|A|B|BE|C1E|C1|CE|C|D1E|D1|DE|D|S|T)\b/g)
  if (!found) return []
  // "Førerkort klasse B" gives B; a sentence about a bachelor in Oslo must
  // not give A and B, so a class only counts where nothing else is claimed.
  const words = text.split(/\s+/).filter((word) => /[a-zæøå]{3,}/i.test(word))
  if (words.length > 6) return []
  return [...new Set(found)]
}

/**
 * Reads a CV that somebody else's tool produced.
 *
 * `lines` are visual lines in reading order. Where the extractor knows the
 * type size it is used to find the name, which is almost always the largest
 * thing on the first page.
 */
export function parseCv(input: Line[]): ParsedCv {
  // LinkedIn's export is laid out unlike any other CV, so it is put into the
  // ordinary order first rather than parsed by rules of its own.
  const lines = isLinkedInExport(input)
    ? normaliseLinkedIn(input, (text) => headingType({ text }) !== null)
    : input

  const clean: Line[] = []
  for (const line of lines) {
    const text = line.text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const previous = clean[clean.length - 1]
    // A bullet glyph on a line of its own belongs to the line after it.
    if (previous && LONE_BULLET.test(previous.text)) {
      clean[clean.length - 1] = { ...line, text: `• ${text}` }
      continue
    }
    // The year that wrapped away from its date range goes back into it.
    if (previous && /^\d{4}$/.test(text) && HALF_RANGE.test(previous.text)) {
      clean[clean.length - 1] = {
        ...previous,
        text: previous.text.replace(HALF_RANGE, `$1 ${text}`),
      }
      continue
    }
    clean.push(...splitHeading({ ...line, text }))
  }

  const result: ParsedCv = {
    personalia: {
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phone: '',
      city: '',
      country: '',
      links: [],
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    interests: [],
    certifications: [],
    courses: [],
    projects: [],
    volunteering: [],
    references: [],
    drivingLicence: [],
    unrecognised: [],
  }

  // --- contact details, from anywhere in the document ----------------------

  for (const line of clean) {
    if (!result.personalia.email) {
      const email = EMAIL.exec(line.text)
      if (email) result.personalia.email = email[0]
    }
    if (!result.personalia.phone) {
      const phone = findPhone(line.text)
      if (phone) result.personalia.phone = phone
    }
    for (const url of line.text.match(URL) ?? []) {
      if (!result.personalia.links.includes(url)) result.personalia.links.push(url)
    }
    // Only from a line that is plainly contact details, so a job's location
    // does not become where the person lives.
    if (!result.personalia.city && (EMAIL.test(line.text) || findPhone(line.text))) {
      const place = findPlace(line.text)
      if (place) {
        result.personalia.city = place.city
        result.personalia.country = place.country
      }
    }
  }

  // --- the name, by type size ----------------------------------------------

  const NAME_SHAPE = /^[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,3}$/u
  /** Words a CV sets in large type that are labels, not somebody's name. */
  const LABELS =
    /^(e-?post|email|mail|telefon|mobil|tlf|adresse|kontakt|profil|portefølje|portfolio|cv|curriculum|vitae|resume|résumé)$/i
  const nameShaped = (line: Line) =>
    NAME_SHAPE.test(line.text) &&
    !EMAIL.test(line.text) &&
    !findPhone(line.text) &&
    !headingType(line)

  /**
   * A single large word can be a name: templates that set the given name on
   * its own line, and OCR, which reads a name a word at a time. A label set
   * in the same type is not, however large it is.
   */
  const couldBeName = (line: Line) =>
    nameShaped(line) ||
    (/^[\p{Lu}][\p{L}'’-]+$/u.test(line.text) && !LABELS.test(line.text) && !headingType(line))

  const header = clean.slice(0, 12)
  // Wider when sizes are known: on a page read in columns the name can come
  // after a whole sidebar, and size tells it apart from everything there.
  const sized = clean.slice(0, 40).filter((line) => typeof line.size === 'number')
  const biggest = sized.reduce<Line | null>(
    (best, line) => (best === null || line.size! > best.size! ? line : best),
    null,
  )
  const biggestName = sized
    .filter(nameShaped)
    .reduce<Line | null>(
      (best, line) => (best === null || line.size! > best.size! ? line : best),
      null,
    )

  const nameLine =
    // The largest name-shaped line, when it is also the largest line or
    // close to it. A name set smaller than the body text is not a name.
    (biggestName && biggest && biggestName.size! >= biggest.size! * 0.8 ? biggestName : null) ??
    // The largest line near the top, as long as it reads like a name at all.
    // Without the shape check a scanned CV whose biggest words are the
    // labels "Email" or "Telefon" was imported with Email as a first name.
    (sized.length > 0 && biggest && clean.indexOf(biggest) < 12 && couldBeName(biggest)
      ? biggest
      : null) ??
    // No type information: fall back to the first line that reads like a name
    // and carries no contact details.
    header.find(nameShaped) ??
    null

  if (nameLine) {
    // A name broken across lines - one word per line, all set the same size,
    // which both sidebar templates and OCR produce - is one name. Only where
    // the sizes are known: without them every line is "the same size" as the
    // name, and the job title below it would be swallowed.
    const rest: string[] = []
    if (nameLine.size !== undefined) {
      for (let index = clean.indexOf(nameLine) + 1; index < clean.length; index += 1) {
        const next = clean[index]!
        if (next.size !== nameLine.size || !couldBeName(next) || rest.length >= 3) break
        rest.push(next.text)
      }
    }

    // "ANDERS NILSEN" is typography, not the spelling of the name.
    const whole = [nameLine.text, ...rest].join(' ')
    const name =
      whole === whole.toUpperCase()
        ? whole
            .toLowerCase()
            .replace(/(^|[\s'’-])(\p{L})/gu, (_, before: string, letter: string) =>
              before + letter.toUpperCase(),
            )
        : whole
    const parts = name.split(' ').filter(Boolean)
    result.personalia.firstName = parts[0] ?? ''
    result.personalia.lastName = parts.slice(1).join(' ')

    // The line under the name is the job title often enough to be worth
    // taking, as long as it is not contact details.
    const next = clean[clean.indexOf(nameLine) + 1]
    if (
      next &&
      !EMAIL.test(next.text) &&
      !findPhone(next.text) &&
      !headingType(next) &&
      // "Valgfritt: bilde" is a template's instruction, not a job title.
      !next.text.includes(':') &&
      next.text.length < 60
    ) {
      result.personalia.title = next.text
    }
  }

  // --- split into sections --------------------------------------------------

  const blocks: { type: SectionType | null; lines: Line[] }[] = [{ type: null, lines: [] }]
  const preamble = new Set<string>()

  for (const line of clean) {
    const type = headingType(line)
    if (type) {
      blocks.push({ type, lines: [] })
      continue
    }
    // A new column with no heading of its own belongs to no section we know.
    if (line.columnStart && blocks.length > 1) blocks.push({ type: null, lines: [] })
    if (blocks.length === 1) preamble.add(line.text)
    blocks[blocks.length - 1]!.lines.push(line)
  }

  for (const block of blocks) {
    const texts = block.lines.map((line) => line.text)

    if (block.type === null || block.type === 'other') {
      // The preamble holds the name and contact details already taken, and
      // "other" is a section this app has no home for. Both go back to the
      // user rather than being guessed at.
      result.unrecognised.push(...texts)
      continue
    }

    if (block.type === 'summary') {
      result.summary = texts.join('\n')
      continue
    }

    if (
      block.type === 'experience' ||
      block.type === 'education' ||
      block.type === 'courses' ||
      block.type === 'projects' ||
      block.type === 'volunteering'
    ) {
      const { entries, leftovers } = buildEntries(block.lines)
      // Added to, not replaced: "Relevant erfaring" and "Annen erfaring" are
      // two blocks of the same kind.
      result[block.type].push(...entries)
      result.unrecognised.push(...leftovers)
      continue
    }

    if (block.type === 'certifications') {
      result.certifications.push(...buildCertifications(texts))
      continue
    }

    if (block.type === 'references') {
      const { references, leftovers } = buildReferences(texts)
      result.references.push(...references)
      result.unrecognised.push(...leftovers)
      continue
    }

    if (block.type === 'drivingLicence') {
      const classes = licenceClasses(texts.join(' '))
      if (classes.length > 0) result.drivingLicence.push(...classes)
      else result.unrecognised.push(...texts)
      continue
    }

    // A list is set in one size, and its items are short. Lines that are
    // neither are most likely the next thing on the page - a quote, a referee
    // - and are handed back rather than listed as a language someone speaks.
    const limit = block.type === 'languages' ? 4 : 6
    const listSize = block.lines[0]?.size
    for (const line of block.lines) {
      const sameSize =
        listSize === undefined || line.size === undefined || Math.abs(line.size - listSize) < 0.5
      for (const item of splitList(line.text)) {
        if (!sameSize || item.split(' ').length > limit) {
          result.unrecognised.push(item)
          continue
        }
        if (block.type === 'skills') result.skills.push(splitLevel(item, SKILL_LEVELS))
        else if (block.type === 'languages') result.languages.push(splitLevel(item, LANGUAGE_LEVELS))
        else result.interests.push(item)
      }
    }
  }

  // The header lines already taken as contact details are noise in the
  // leftovers - but only those. A referee's email address further down the
  // page is somebody else's, and dropping every line that mentions an address
  // deleted the reference along with it.
  result.unrecognised = result.unrecognised.filter(
    (line) =>
      line !== nameLine?.text &&
      line !== result.personalia.title &&
      !(preamble.has(line) && result.personalia.email && line.includes(result.personalia.email)),
  )

  return result
}
