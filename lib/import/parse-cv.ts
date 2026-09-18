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
      'relevant erfaring',
      'annen erfaring',
      'relevant arbeidserfaring',
      'annen arbeidserfaring',
      'relevant experience',
      'other experience',
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
      'it-ferdigheter',
      'digitale ferdigheter',
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
      'resultater',
      'nøkkelresultater',
      'prestasjoner',
      'achievements',
      'key achievements',
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

  if (first === undefined) return { entries: [], leftovers: lines.map((line) => line.text) }

  const entries: ParsedEntry[] = []
  const leftovers: string[] = []

  // "Redaktør · Universitetet i Oslo" beside the date is role and employer,
  // as separate cells of a table row or separate boxes come out.
  const newEntry = (range: DateRange): ParsedEntry => {
    const [role = '', ...organisation] = range.rest.split(' · ')
    return {
      role,
      organisation: organisation.join(' · '),
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
      else entry.bullets.push(range.rest)
    }
    entries.push(entry)
  }

  const last = entries[entries.length - 1]!
  fill(last, lines.slice(dated[dated.length - 1]! + 1).map((line) => line.text))

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

  const NAME_SHAPE = /^[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,3}$/u
  const nameShaped = (line: Line) =>
    NAME_SHAPE.test(line.text) &&
    !EMAIL.test(line.text) &&
    !findPhone(line.text) &&
    !headingType(line)

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
    (sized.length > 0 && biggest && clean.indexOf(biggest) < 12 && !headingType(biggest)
      ? biggest
      : null) ??
    // No type information: fall back to the first line that reads like a name
    // and carries no contact details.
    header.find(nameShaped) ??
    null

  if (nameLine) {
    // "ANDERS NILSEN" is typography, not the spelling of the name.
    const name =
      nameLine.text === nameLine.text.toUpperCase()
        ? nameLine.text
            .toLowerCase()
            .replace(/(^|[\s'’-])(\p{L})/gu, (_, before: string, letter: string) =>
              before + letter.toUpperCase(),
            )
        : nameLine.text
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

    if (block.type === 'experience' || block.type === 'education') {
      const { entries, leftovers } = buildEntries(block.lines)
      // Added to, not replaced: "Relevant erfaring" and "Annen erfaring" are
      // two blocks of the same kind.
      result[block.type].push(...entries)
      result.unrecognised.push(...leftovers)
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
        if (sameSize && item.split(' ').length <= limit) result[block.type].push(item)
        else result.unrecognised.push(item)
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
