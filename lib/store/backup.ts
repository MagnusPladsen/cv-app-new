import { buildPrintTitle } from '@/lib/print/build-print-html'
import type { CvDocument } from '@/lib/schema/cv'
import { SchemaError, safeMigrateDocument } from '@/lib/schema/migrations'

export function serialiseDocument(doc: CvDocument): string {
  return JSON.stringify(doc, null, 2)
}

/** e.g. Ola_Nordmann_CV_2026-09-02.json */
export function backupFilename(doc: CvDocument, now: Date = new Date()): string {
  const name = buildPrintTitle(doc.personalia.firstName, doc.personalia.lastName)
  const date = now.toISOString().slice(0, 10)
  return `${name}_${date}.json`
}

/** A whole-account export: every CV in one file. */
export type Bundle = { app: 'cvapp'; documents: CvDocument[] }

export function serialiseBundle(documents: CvDocument[]): string {
  const bundle: Bundle = { app: 'cvapp', documents }
  return JSON.stringify(bundle, null, 2)
}

/** e.g. CVApp_alle-cv-er_2026-09-08.json */
export function bundleFilename(now: Date = new Date()): string {
  return `CVApp_alle-cv-er_${now.toISOString().slice(0, 10)}.json`
}

export type ParseResult =
  | { ok: true; documents: CvDocument[] }
  | { ok: false; error: SchemaError }

/**
 * Parses a backup file, whether it holds one CV or a whole account.
 *
 * A malformed JSON file and a structurally invalid document both come back as
 * `ok: false`, never as a thrown exception, so the dashboard can show an error
 * instead of crashing. Migration runs as part of this, so a backup written by
 * an older schema version imports without extra handling.
 *
 * Downloading a CV each is not an option for a whole account - browsers block
 * the second and later files of a multi-file download - so the account export
 * writes one bundle, and this reads back either shape.
 */
export function parseBackup(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: new SchemaError('invalid', 'That file is not valid JSON.') }
  }

  const many =
    Array.isArray(parsed) ? parsed
    : isBundle(parsed) ? parsed.documents
    : null

  if (many === null) {
    const single = safeMigrateDocument(parsed)
    return single.ok ? { ok: true, documents: [single.document] } : single
  }

  if (many.length === 0) {
    return { ok: false, error: new SchemaError('invalid', 'That file holds no CVs.') }
  }

  const documents: CvDocument[] = []
  for (const candidate of many) {
    const result = safeMigrateDocument(candidate)
    // One unreadable CV should not cost the user the rest of the file, so a
    // bundle fails only when nothing in it could be read.
    if (result.ok) documents.push(result.document)
  }

  if (documents.length === 0) {
    return { ok: false, error: new SchemaError('invalid', 'No CV in that file could be read.') }
  }

  return { ok: true, documents }
}

function isBundle(value: unknown): value is Bundle {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { documents?: unknown }).documents)
  )
}
