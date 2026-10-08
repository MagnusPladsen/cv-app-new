import { scrub } from '@/lib/ai/redact'
import type { Facts } from '@/lib/ai/tools'
import type { Passage, Target } from '@/lib/ai/request'
import { checkDocument } from '@/lib/quality/checks'
import type { CvLabels } from '@/lib/cv-labels'
import { isImportPile } from '@/lib/import/pile'
import type { CvDocument, TimelineEntry } from '@/lib/schema/cv'

/**
 * Everything the browser works out before it is allowed to ask.
 *
 * The three numbers the assistant is given instead of a document, the places a
 * suggestion is allowed to land, and the text itself with the identifiers
 * taken out. All of it runs here, in the browser, so there is nothing to strip
 * on arrival - by then it would already have travelled.
 */

/**
 * What the app measured, as the assistant's `page_count` and `quality_check`
 * tools will read it back out. The findings carry their ids and nothing else:
 * the id says "tooLong", the values would say which employer.
 */
export function buildFacts(document: CvDocument, pages: number): Facts {
  return {
    pages,
    paper: document.paper,
    findings: checkDocument(document, { pages })
      .slice(0, 40)
      .map((finding) => ({
        id: finding.id,
        severity: finding.severity,
        ...(finding.sectionId ? { sectionId: finding.sectionId } : {}),
      })),
  }
}

/**
 * The whole-field places a chat answer may point at: the summary, the letter,
 * and the title at the top of the CV. Bullets are not here on purpose - one
 * bullet is asked about from the field itself, where the person can see which
 * one they mean.
 *
 * Labels name the part of the CV, never its contents. "Om meg", not the
 * sentence in it.
 */
export function chatTargets(
  document: CvDocument,
  labels: CvLabels,
  titleLabel: string,
  letterLabel: string,
): Target[] {
  const targets: Target[] = [{ kind: 'field', label: titleLabel }]

  const summary = document.sections.find(
    (section) => section.type === 'summary' && section.enabled,
  )
  if (summary) {
    targets.push({
      kind: 'summary',
      sectionId: summary.id,
      label: summary.titleOverride?.trim() || labels.sections.summary,
    })
  }

  if (document.coverLetter?.enabled) targets.push({ kind: 'coverLetter', label: letterLabel })

  return targets
}

/** One bullet, asked about from the field it is in. */
export function bulletTarget(
  sectionId: string,
  entryId: string,
  index: number,
  label: string,
): Target {
  return { kind: 'bullet', sectionId, entryId, index, label }
}

export type Prepared =
  | { ok: true; message: string }
  | { ok: false; reason: 'nationalId' | 'empty' }

/**
 * The question, with the person taken out of it.
 *
 * Refuses rather than sends when a national identity number is in the text,
 * and refuses an empty question rather than paying for an answer to nothing.
 */
export function prepareMessage(text: string, document: CvDocument): Prepared {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }

  const scrubbed = scrub(trimmed, document.personalia)
  if (!scrubbed.ok) return { ok: false, reason: 'nationalId' }

  return { ok: true, message: scrubbed.text }
}

/**
 * The CV's own text, for the one task that cannot work without it.
 *
 * A review has to read the bullets to say which are weak, so pressing "check
 * my CV" sends more than a question does - and sends it once, on that press,
 * with the same scrubbing as everything else.
 *
 * What is left out is the point of the function:
 *
 * - **employers and places.** A role, not where it was held
 * - **references.** Somebody else's name and phone number, and the one part of
 *   a CV that is not the user's own personal data to hand over
 * - **dates.** The gap and ordering checks are arithmetic, and
 *   `checkDocument` has already done them
 * - **the photograph, and every contact detail.** There is no field for them
 */
export function collectPassages(
  document: CvDocument,
  labels: CvLabels,
  titleLabel: string,
  letterLabel: string,
): { ok: true; passages: Passage[] } | { ok: false; reason: 'nationalId' } {
  const passages: Passage[] = []
  let refused = false

  const add = (passage: Omit<Passage, 'text'>, raw: string | undefined) => {
    const text = (raw ?? '').trim()
    if (!text || refused) return
    const scrubbed = scrub(text, document.personalia)
    if (!scrubbed.ok) {
      refused = true
      return
    }
    passages.push({ ...passage, text: scrubbed.text.slice(0, 400) })
  }

  add({ kind: 'title', label: titleLabel }, document.personalia.title)

  for (const section of document.sections) {
    if (!section.enabled || isImportPile(section)) continue
    const name = section.titleOverride?.trim() || labels.sections[section.type]

    if (section.type === 'summary') add({ kind: 'summary', sectionId: section.id, label: name }, section.text)

    if ('entries' in section && Array.isArray(section.entries)) {
      // References are entries too, and the only section whose contents
      // belong to somebody who never agreed to any of this.
      if (section.type === 'references') continue

      const entries = section.entries as TimelineEntry[]
      entries.forEach((entry, entryIndex) => {
        add(
          { kind: 'role', sectionId: section.id, entryId: entry.id, label: `${name} ${entryIndex + 1}` },
          entry.role,
        )
        ;(entry.description ?? '').split('\n').forEach((line, lineIndex) => {
          add(
            {
              kind: 'bullet',
              sectionId: section.id,
              entryId: entry.id,
              index: lineIndex,
              label: `${name} ${entryIndex + 1}, punkt ${lineIndex + 1}`,
            },
            line,
          )
        })
      })
    }

    // How many, and which: "thirty skills says nothing is important" needs
    // both, and neither identifies anybody.
    if (section.type === 'skills' || section.type === 'languages') {
      add({ kind: 'items', sectionId: section.id, label: name }, section.items.map((item) => item.name).join(', '))
    }
    if (section.type === 'interests') {
      add({ kind: 'items', sectionId: section.id, label: name }, section.items.join(', '))
    }
  }

  if (document.coverLetter?.enabled) {
    add({ kind: 'coverLetter', label: letterLabel }, document.coverLetter.body)
  }

  if (refused) return { ok: false, reason: 'nationalId' }
  return { ok: true, passages: passages.slice(0, 40) }
}

/** Where a review's suggestions may land: the passages it was given. */
export function targetsFor(passages: Passage[]): Target[] {
  const targets: Target[] = []
  for (const passage of passages) {
    if (passage.kind === 'title') targets.push({ kind: 'field', label: passage.label })
    if (passage.kind === 'summary' && passage.sectionId) {
      targets.push({ kind: 'summary', sectionId: passage.sectionId, label: passage.label })
    }
    if (passage.kind === 'bullet' && passage.sectionId && passage.entryId) {
      targets.push({
        kind: 'bullet',
        sectionId: passage.sectionId,
        entryId: passage.entryId,
        index: passage.index ?? 0,
        label: passage.label,
      })
    }
    if (passage.kind === 'coverLetter') targets.push({ kind: 'coverLetter', label: passage.label })
  }
  return targets.slice(0, 20)
}
