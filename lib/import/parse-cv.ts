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
}

export type ParsedEntry = {
  role: string
  organisation: string
  /** "YYYY-MM", or "" when the CV only gave a year or nothing. */
  from: string
  to: string
  current: boolean
  bullets: string[]
}

export type ParsedCv = {
  personalia: {
    firstName: string
    lastName: string
    title: string
    email: string
    phone: string
    links: string[]
  }
  summary: string
  experience: ParsedEntry[]
  education: ParsedEntry[]
  skills: string[]
  languages: string[]
  interests: string[]
  /** Everything not claimed, in order, so nothing is silently dropped. */
  unrecognised: string[]
}

/** Section headings, as they are actually written on Norwegian CVs. */
const HEADINGS: { type: keyof typeof SECTION_KEYS; words: string[] }[] = [
  {
    type: 'summary',
    words: [
      'om meg',
      'om deg',
      'profil',
      'sammendrag',
      'nøkkelkvalifikasjoner',
      'kort om meg',
      'summary',
      'profile',
      'about me',
      'objective',
    ],
  },
  {
    type: 'experience',
    words: [
      'arbeidserfaring',
      'erfaring',
      'yrkeserfaring',
      'arbeidspraksis',
      'praksis',
      'arbeid',
      'work experience',
      'experience',
      'employment',
      'employment history',
    ],
  },
  {
    type: 'education',
    words: [
      'utdanning',
      'utdannelse',
      'skolegang',
      'akademisk bakgrunn',
      'education',
      'academic background',
    ],
  },
  {
    type: 'skills',
    words: [
      'ferdigheter',
      'kompetanse',
      'nøkkelkompetanse',
      'kvalifikasjoner',
      'it-kunnskaper',
      'datakunnskaper',
      'skills',
      'key skills',
      'competencies',
      'technical skills',
    ],
  },
  {
    type: 'languages',
    words: ['språk', 'språkkunnskaper', 'languages', 'language skills'],
  },
  {
    type: 'interests',
    words: ['interesser', 'fritid', 'hobbyer', 'interests', 'hobbies'],
  },
  {
    type: 'other',
    words: [
      'kurs',
      'sertifiseringer',
      'sertifikater',
      'verv',
      'frivillig arbeid',
      'frivillighet',
      'referanser',
      'prosjekter',
      'publikasjoner',
      'certifications',
      'courses',
      'projects',
      'references',
      'volunteering',
      'publications',
      'awards',
    ],
  },
]

const SECTION_KEYS = {
  summary: true,
  experience: true,
  education: true,
  skills: true,
  languages: true,
  interests: true,
  other: true,
} as const

type SectionType = keyof typeof SECTION_KEYS

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

/**
 * Whether a line is letter-spaced display type, and its letters if so.
 *
 * CV templates set tracking on section headings, and a PDF records that as
 * real spaces: "OM MEG" comes back as "O M M E G", with the word boundary
 * gone. Every heading in every template in this app is written that way, so
 * without this no section is recognised at all - and with no sections there
 * are no jobs and no education either.
 *
 * Detected by shape rather than by a list: three or more tokens, nearly all
 * of them one character long.
 */
function letterSpaced(text: string): string | null {
  const tokens = text.trim().split(/\s+/)
  if (tokens.length < 3) return null

  const singles = tokens.filter((token) => token.length === 1).length
  if (singles / tokens.length < 0.7) return null

  return tokens.join('').toLowerCase()
}

/** A heading if it names a section and is short enough to be one. */
function headingType(line: Line): SectionType | null {
  const text = normalise(line.text)
  if (!text || text.length > 40) return null

  const spaced = letterSpaced(text)

  for (const heading of HEADINGS) {
    if (heading.words.includes(text)) return heading.type
    // The word boundary does not survive tracking, so both sides are
    // compared with their spaces taken out.
    if (spaced && heading.words.some((word) => word.replace(/\s+/g, '') === spaced)) {
      return heading.type
    }
  }
  return null
}

/** "mai 2021" / "05/2021" / "2021" as "YYYY-MM", or "" for a bare year. */
function monthToken(raw: string): string | null {
  const text = raw.toLowerCase().replace(/\./g, '').trim()

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
  const datePart = String.raw`(?:[A-Za-zæøåÆØÅ]+\.?\s+\d{4}|\d{1,2}[/.\-]\d{4}|\d{4})`
  const pattern = new RegExp(
    `(${datePart})${separator.source}(${datePart}|nå|no|na|d\\.?d\\.?|i dag|present|current|now|ongoing|pågående)`,
    'i',
  )

  const match = pattern.exec(text)
  if (!match) return null

  const from = monthToken(match[1]!)
  if (from === null) return null

  const tail = match[2]!.trim()
  const current = PRESENT.test(tail.replace(/\./g, ''))
  const to = current ? '' : (monthToken(tail) ?? '')

  return {
    from,
    to,
    current,
    rest: (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length))
      .replace(/\s*[|·•,–—-]\s*$/, '')
      .replace(/^\s*[|·•,–—-]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim(),
  }
}

const BULLET = /^\s*[•·▪◦*–—-]\s+/

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

function findPhone(text: string): string | null {
  for (const match of text.match(PHONE_CANDIDATE) ?? []) {
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

/** Splits a list written on one line: "React, Node.js · Figma". */
function splitList(text: string): string[] {
  return text
    .split(/[,;•·|]|\s{3,}/)
    .map((part) => part.replace(BULLET, '').trim())
    .filter((part) => part.length > 1 && part.length < 60)
}

function buildEntries(lines: string[]): { entries: ParsedEntry[]; leftovers: string[] } {
  const entries: ParsedEntry[] = []
  const leftovers: string[] = []

  let current: ParsedEntry | null = null
  let pending: string[] = []

  const flushPending = () => {
    if (!current) {
      leftovers.push(...pending)
      pending = []
      return
    }
    // The lines around the date: the first is the role, the next the
    // employer. Anything after that is description.
    for (const line of pending) {
      if (!current.role) current.role = line
      else if (!current.organisation) current.organisation = line
      else current.bullets.push(line.replace(BULLET, '').trim())
    }
    pending = []
  }

  for (const line of lines) {
    const range = findDateRange(line)

    if (range) {
      flushPending()
      current = {
        role: range.rest,
        organisation: '',
        from: range.from,
        to: range.to,
        current: range.current,
        bullets: [],
      }
      entries.push(current)
      continue
    }

    if (BULLET.test(line) && current) {
      current.bullets.push(line.replace(BULLET, '').trim())
      continue
    }

    pending.push(line)
  }

  flushPending()
  return { entries, leftovers }
}

/**
 * Reads a CV that somebody else's tool produced.
 *
 * `lines` are visual lines in reading order. Where the extractor knows the
 * type size it is used to find the name, which is almost always the largest
 * thing on the first page.
 */
export function parseCv(lines: Line[]): ParsedCv {
  const clean = lines
    .map((line) => ({ ...line, text: line.text.replace(/\s+/g, ' ').trim() }))
    .filter((line) => line.text.length > 0)

  const result: ParsedCv = {
    personalia: { firstName: '', lastName: '', title: '', email: '', phone: '', links: [] },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    interests: [],
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
  }

  // --- the name, by type size ----------------------------------------------

  const header = clean.slice(0, 12)
  const sized = header.filter((line) => typeof line.size === 'number')
  const biggest = sized.reduce<Line | null>(
    (best, line) => (best === null || line.size! > best.size! ? line : best),
    null,
  )

  const nameLine =
    biggest ??
    // No type information: fall back to the first line that reads like a name
    // and carries no contact details.
    header.find(
      (line) =>
        !EMAIL.test(line.text) &&
        !findPhone(line.text) &&
        /^[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,3}$/u.test(line.text),
    ) ??
    null

  if (nameLine) {
    const parts = nameLine.text.split(' ').filter(Boolean)
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
      next.text.length < 60
    ) {
      result.personalia.title = next.text
    }
  }

  // --- split into sections --------------------------------------------------

  const blocks: { type: SectionType | null; lines: string[] }[] = [{ type: null, lines: [] }]
  const preamble = new Set<string>()

  for (const line of clean) {
    const type = headingType(line)
    if (type) {
      blocks.push({ type, lines: [] })
      continue
    }
    if (blocks.length === 1) preamble.add(line.text)
    blocks[blocks.length - 1]!.lines.push(line.text)
  }

  for (const block of blocks) {
    if (block.type === null || block.type === 'other') {
      // The preamble holds the name and contact details already taken, and
      // "other" is a section this app has no home for. Both go back to the
      // user rather than being guessed at.
      result.unrecognised.push(...block.lines)
      continue
    }

    if (block.type === 'summary') {
      result.summary = block.lines.join('\n')
      continue
    }

    if (block.type === 'experience' || block.type === 'education') {
      const { entries, leftovers } = buildEntries(block.lines)
      result[block.type] = entries
      result.unrecognised.push(...leftovers)
      continue
    }

    const items = block.lines.flatMap(splitList)
    result[block.type] = items
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
