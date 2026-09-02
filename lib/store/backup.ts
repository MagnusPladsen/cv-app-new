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

export type ParseResult =
  | { ok: true; document: CvDocument }
  | { ok: false; error: SchemaError }

/**
 * Parses a backup file. A malformed JSON file and a structurally invalid
 * document both come back as `ok: false`, never as a thrown exception, so the
 * dashboard can show an error instead of crashing.
 *
 * Migration runs as part of this, so a backup written by an older schema
 * version imports without extra handling.
 */
export function parseBackup(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: new SchemaError('invalid', 'That file is not valid JSON.') }
  }

  return safeMigrateDocument(parsed)
}
