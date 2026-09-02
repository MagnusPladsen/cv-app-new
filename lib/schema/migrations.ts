import { CURRENT_SCHEMA_VERSION, type CvDocument, cvDocumentSchema } from './cv'

export type SchemaErrorReason =
  | 'missing-version'
  | 'future-version'
  | 'no-migration'
  | 'invalid'

export class SchemaError extends Error {
  readonly reason: SchemaErrorReason

  constructor(reason: SchemaErrorReason, message: string) {
    super(message)
    this.name = 'SchemaError'
    this.reason = reason
  }
}

type RawDocument = Record<string, unknown>

/**
 * A migration registered under key N upgrades a document from schemaVersion N
 * to schemaVersion N+1. Empty while CURRENT_SCHEMA_VERSION is 1.
 */
export const migrations: Record<number, (doc: RawDocument) => RawDocument> = {}

function isRecord(value: unknown): value is RawDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function migrateDocument(raw: unknown): CvDocument {
  if (!isRecord(raw)) {
    throw new SchemaError('missing-version', 'Stored value is not an object.')
  }

  const version = raw.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new SchemaError('missing-version', 'Stored document has no schemaVersion.')
  }

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new SchemaError(
      'future-version',
      `Document uses schema version ${version}, but this app understands at most ${CURRENT_SCHEMA_VERSION}.`,
    )
  }

  let current = raw
  let currentVersion = version

  while (currentVersion < CURRENT_SCHEMA_VERSION) {
    const migration = migrations[currentVersion]
    if (!migration) {
      throw new SchemaError(
        'no-migration',
        `No migration registered from schema version ${currentVersion}.`,
      )
    }
    current = migration(current)
    currentVersion += 1
    current.schemaVersion = currentVersion
  }

  const parsed = cvDocumentSchema.safeParse(current)
  if (!parsed.success) {
    throw new SchemaError(
      'invalid',
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    )
  }

  return parsed.data
}

export function safeMigrateDocument(
  raw: unknown,
): { ok: true; document: CvDocument } | { ok: false; error: SchemaError } {
  try {
    return { ok: true, document: migrateDocument(raw) }
  } catch (error) {
    if (error instanceof SchemaError) return { ok: false, error }
    throw error
  }
}
