import { scrub } from '@/lib/ai/redact'
import type { Facts } from '@/lib/ai/tools'
import type { Target } from '@/lib/ai/request'
import { checkDocument } from '@/lib/quality/checks'
import type { CvLabels } from '@/lib/cv-labels'
import type { CvDocument } from '@/lib/schema/cv'

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
