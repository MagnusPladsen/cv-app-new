import type { CvDocument, Section, TimelineEntry } from '@/lib/schema/cv'

export type Severity = 'error' | 'warning' | 'info'

export type Finding = {
  /** Message key under the `quality` namespace. Also the identity of a check. */
  id: string
  severity: Severity
  /** The section to jump to, when the finding belongs to one. */
  sectionId?: string
  /** Interpolated into the message. */
  values?: Record<string, string | number>
}

export type CheckContext = {
  /** From the preview's own measurement: a document cannot count its pages. */
  pages: number
}

const text = (value: string | undefined) => (value ?? '').trim()
const filled = (value: string | undefined) => text(value).length > 0

/**
 * A Norwegian national identity number: eleven digits, sometimes written with
 * a space or dash after the six-digit date. Matched loosely on purpose - the
 * cost of missing one is identity theft, and the cost of a false positive is
 * one dismissable line.
 *
 * Deliberately not matching a plain eight-digit phone number, which is the
 * other long run of digits a CV legitimately contains.
 */
const NATIONAL_ID = /\b\d{6}[\s-]?\d{5}\b/

/** Every string a person can type into a CV, for the scans that search prose. */
function freeText(document: CvDocument): { sectionId?: string; value: string }[] {
  const chunks: { sectionId?: string; value: string }[] = [
    { value: document.personalia.title },
    ...document.personalia.links.map((link) => ({ value: link.label })),
    // The søknad is free text like any other, and is the likeliest place
    // somebody writes out a date of birth in full.
    { value: document.coverLetter?.body ?? '' },
  ]

  for (const section of document.sections) {
    const push = (value: string | undefined) =>
      chunks.push({ sectionId: section.id, value: value ?? '' })

    if (section.type === 'summary') push(section.text)
    if ('entries' in section && section.entries) {
      for (const entry of section.entries) {
        if ('description' in entry) push(entry.description)
        if ('role' in entry) push(entry.role)
      }
    }
    if ('bullets' in section && section.bullets) section.bullets.forEach(push)
    if ('text' in section && typeof section.text === 'string') push(section.text)
    if (section.type === 'interests') section.items.forEach(push)
  }

  return chunks
}

function timelineSections(document: CvDocument): Section[] {
  return document.sections.filter(
    (section) => section.enabled && 'entries' in section && Array.isArray(section.entries),
  )
}

function entriesOf(section: Section): TimelineEntry[] {
  return 'entries' in section && Array.isArray(section.entries)
    ? (section.entries as TimelineEntry[])
    : []
}

/** "YYYY-MM" as a comparable number, or null. */
function month(value: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 12 + Number(match[2])
}

/**
 * Everything worth telling someone about their own CV, without sending it
 * anywhere.
 *
 * The competitors' equivalents run a model on a server. Almost none of what
 * they report needs one: the useful checks are arithmetic on dates, the
 * presence of a contact method, and a handful of conventions specific to the
 * market you are applying in. All of that works offline, which is the only
 * reason CVApp can offer it at all.
 *
 * Severity means what it says. An `error` is something that will cost you the
 * application or expose you; a `warning` is a likely mistake; `info` is a
 * convention you may have a reason to ignore. Nothing here blocks anything.
 */
export function checkDocument(document: CvDocument, context: CheckContext): Finding[] {
  const findings: Finding[] = []
  const { personalia } = document

  // --- Identity and contact ------------------------------------------------

  for (const chunk of freeText(document)) {
    if (NATIONAL_ID.test(chunk.value)) {
      findings.push({ id: 'nationalId', severity: 'error', sectionId: chunk.sectionId })
      break
    }
  }

  if (!filled(personalia.firstName) && !filled(personalia.lastName)) {
    findings.push({ id: 'noName', severity: 'error' })
  }

  if (!filled(personalia.email) && !filled(personalia.phone)) {
    findings.push({ id: 'noContact', severity: 'error' })
  } else if (filled(personalia.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(personalia.email)) {
    findings.push({ id: 'emailLooksWrong', severity: 'warning' })
  }

  if (!filled(personalia.title)) {
    findings.push({ id: 'noTitle', severity: 'warning' })
  }

  if (!filled(personalia.city)) {
    findings.push({ id: 'noCity', severity: 'info' })
  }

  // A link that is not a link is worse than no link: it prints as text and
  // cannot be clicked in the PDF.
  const brokenLink = personalia.links.find(
    (link) => filled(link.url) && !/^https?:\/\/[^\s.]+\.[^\s]{2,}/.test(text(link.url)),
  )
  if (brokenLink) {
    findings.push({ id: 'linkNotAUrl', severity: 'warning', values: { label: text(brokenLink.label) || text(brokenLink.url) } })
  }

  // --- Substance -----------------------------------------------------------

  const timeline = timelineSections(document)
  const allEntries = timeline.flatMap(entriesOf)
  const realEntries = allEntries.filter((entry) => filled(entry.role) || filled(entry.organisation))

  if (realEntries.length === 0) {
    findings.push({ id: 'noHistory', severity: 'warning' })
  }

  const summary = document.sections.find((section) => section.type === 'summary')
  if (summary && summary.type === 'summary' && summary.enabled) {
    const length = text(summary.text).length
    if (length === 0) findings.push({ id: 'noSummary', severity: 'info', sectionId: summary.id })
    else if (length < 120)
      findings.push({ id: 'summaryShort', severity: 'info', sectionId: summary.id })
    else if (length > 700)
      findings.push({ id: 'summaryLong', severity: 'info', sectionId: summary.id })
  }

  // --- Dates ---------------------------------------------------------------

  const now = new Date()
  const thisMonth = now.getFullYear() * 12 + (now.getMonth() + 1)

  for (const section of timeline) {
    for (const entry of entriesOf(section)) {
      if (!filled(entry.role) && !filled(entry.organisation)) continue

      const from = month(entry.from)
      const to = entry.current ? thisMonth : month(entry.to)

      if (from === null) {
        findings.push({
          id: 'entryNoDates',
          severity: 'warning',
          sectionId: section.id,
          values: { entry: text(entry.role) || text(entry.organisation) },
        })
        continue
      }

      if (to !== null && to < from) {
        findings.push({
          id: 'entryEndsBeforeStart',
          severity: 'error',
          sectionId: section.id,
          values: { entry: text(entry.role) || text(entry.organisation) },
        })
      }

      if (from > thisMonth) {
        findings.push({
          id: 'entryInFuture',
          severity: 'warning',
          sectionId: section.id,
          values: { entry: text(entry.role) || text(entry.organisation) },
        })
      }
    }
  }

  // A gap Norwegian employers routinely ask about in the interview. Better to
  // know it is visible than to be surprised by the question.
  const spans = realEntries
    .map((entry) => ({
      from: month(entry.from),
      to: entry.current ? thisMonth : month(entry.to),
    }))
    .filter((span): span is { from: number; to: number } => span.from !== null && span.to !== null)
    .sort((a, b) => a.from - b.from)

  let covered = spans[0]?.to ?? null
  for (const span of spans.slice(1)) {
    if (covered !== null && span.from - covered >= 12) {
      findings.push({
        id: 'gap',
        severity: 'info',
        values: { months: span.from - covered },
      })
      break
    }
    if (covered !== null) covered = Math.max(covered, span.to)
  }

  // --- Writing -------------------------------------------------------------

  for (const section of timeline) {
    for (const entry of entriesOf(section)) {
      const bullets = text(entry.description)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (entry.descriptionMode === 'bullets' && bullets.length > 6) {
        findings.push({
          id: 'tooManyBullets',
          severity: 'info',
          sectionId: section.id,
          values: { entry: text(entry.role) || text(entry.organisation), count: bullets.length },
        })
      }

      const longest = bullets.reduce((max, line) => Math.max(max, line.length), 0)
      if (longest > 220) {
        findings.push({
          id: 'longBullet',
          severity: 'info',
          sectionId: section.id,
          values: { entry: text(entry.role) || text(entry.organisation) },
        })
      }
    }
  }

  // --- Norwegian convention ------------------------------------------------

  const references = document.sections.find((section) => section.type === 'references')
  if (references && references.type === 'references' && references.enabled) {
    const withContact = references.entries.filter(
      (entry) => filled(entry.email) || filled(entry.phone),
    )
    if (withContact.length > 0) {
      findings.push({
        id: 'referencesOnRequest',
        severity: 'info',
        sectionId: references.id,
        values: { count: withContact.length },
      })
    }
  }

  if (personalia.photo && personalia.showPhoto) {
    findings.push({ id: 'photo', severity: 'info' })
  }

  // --- The søknad ----------------------------------------------------------

  const letter = document.coverLetter
  if (letter?.enabled) {
    if (!filled(letter.body)) {
      findings.push({ id: 'letterEmpty', severity: 'warning' })
    } else if (text(letter.body).length > 2600) {
      // Roughly a page at this measure. A søknad that runs to two is not one.
      findings.push({ id: 'letterLong', severity: 'info' })
    }

    if (!filled(letter.position)) {
      findings.push({ id: 'letterNoPosition', severity: 'warning' })
    }
  }

  // --- Length --------------------------------------------------------------

  if (context.pages > 2) {
    findings.push({ id: 'tooLong', severity: 'warning', values: { pages: context.pages } })
  }

  return findings
}

/** Errors first, then warnings, then the rest. Document order within each. */
export function sortFindings(findings: Finding[]): Finding[] {
  const rank: Record<Severity, number> = { error: 0, warning: 1, info: 2 }
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity])
}
