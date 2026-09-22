import type { Line } from './parse-cv'

/**
 * LinkedIn's own "Save to PDF", put into the order every other CV uses.
 *
 * It is the file people reach for first - it takes two clicks and needs no
 * writing - and it is laid out unlike anything else:
 *
 * - a sidebar of Contact, Top Skills, Languages and Certifications, then the
 *   name, then the body;
 * - each job written employer first, role second, which is the opposite of
 *   every other CV and of what the entry builder expects;
 * - a duration after the dates, "(4 years 1 month)", which reads as part of
 *   the job title;
 * - "Page 1 of 3" at the foot of every page;
 * - link markers on their own lines: "(LinkedIn)", "(Company)".
 *
 * Rather than a second parser, the lines are rewritten into the shape the
 * ordinary one already reads. Everything downstream - columns, dates,
 * headings - then works as it does for any other CV.
 */

const FOOTER = /^page\s+\d+\s+of\s+\d+$/i
const LINK_MARKER = /^\((linkedin|other|company|personal|portfolio|blog)\)$/i
/** "(4 years 1 month)", "(1 year)", "(3 måneder)". */
const DURATION = /\((?:\d+\s*(?:years?|year|år|months?|måneder|måned|mnd)\.?\s*)+\)/gi

/** Section names only LinkedIn writes, and what they are called here. */
const HEADINGS = new Map<string, string>([
  ['top skills', 'Ferdigheter'],
  ['skills & endorsements', 'Ferdigheter'],
  ['honors-awards', 'Priser'],
  ['honors & awards', 'Priser'],
  ['volunteer experience', 'Frivillig arbeid'],
  ['licenses & certifications', 'Sertifiseringer'],
])

/** The word above the sidebar's contact details. The details themselves are
 * kept: the address and the links are read from the page as a whole. */
const CONTACT = /^contact$/i

/** The section names LinkedIn writes, which tell one block from the next. */
const SECTION = new Set([
  'top skills',
  'skills & endorsements',
  'languages',
  'certifications',
  'licenses & certifications',
  'honors-awards',
  'honors & awards',
  'publications',
  'summary',
  'experience',
  'education',
  'volunteer experience',
  'interests',
  'recommendations',
  'projects',
])

/**
 * Whether this is a LinkedIn export. Two marks are asked for, because one -
 * a page footer, or the word "Summary" - is a coincidence waiting to happen.
 */
export function isLinkedInExport(lines: Line[]): boolean {
  let marks = 0
  for (const line of lines.slice(0, 120)) {
    const text = line.text.trim().toLowerCase()
    if (FOOTER.test(text)) marks += 1
    if (text === 'top skills' || text === 'skills & endorsements') marks += 1
    if (LINK_MARKER.test(text)) marks += 1
    if (/^www\.linkedin\.com\/in\//.test(text)) marks += 1
    if (marks >= 2) return true
  }
  return false
}

const isDateLine = (text: string) =>
  /\b(?:\d{4})\b/.test(text) &&
  /(?:–|—|-|to|til)/.test(text) &&
  /(?:present|nå|current|\d{4})/i.test(text)

/**
 * Rewrites a LinkedIn export into the order the ordinary parser reads.
 *
 * `isHeading` is passed in rather than imported: the parser owns the list of
 * section names, and importing it back here would make the two modules
 * depend on each other.
 */
export function normaliseLinkedIn(lines: Line[], isHeading: (text: string) => boolean): Line[] {
  const kept: Line[] = []

  for (const line of lines) {
    const text = line.text.replace(DURATION, '').replace(/\s+/g, ' ').trim()
    const lower = text.toLowerCase()

    if (!text || FOOTER.test(text) || LINK_MARKER.test(text)) continue

    // "Contact" heads the sidebar's address and links. The heading goes; the
    // lines under it stay, because that is where the email and the links are.
    if (CONTACT.test(lower)) continue

    kept.push({ ...line, text: HEADINGS.get(lower) ?? text })
  }

  // Employer above role, which is LinkedIn's order and nobody else's: the
  // two lines directly above a date belong the other way round.
  for (let index = 2; index < kept.length; index += 1) {
    if (!isDateLine(kept[index]!.text)) continue
    const role = kept[index - 1]!
    const employer = kept[index - 2]!
    if (isDateLine(role.text) || isDateLine(employer.text)) continue
    // Only two lines of an entry swap. A section heading above a job is not
    // one of them, and dragging it below the employer hides the section.
    if (isHeading(role.text) || isHeading(employer.text)) continue
    kept[index - 2] = role
    kept[index - 1] = employer
  }

  return kept
}
