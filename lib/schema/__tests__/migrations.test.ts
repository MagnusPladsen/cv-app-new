import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import { SchemaError, migrateDocument, safeMigrateDocument } from '@/lib/schema/migrations'

function fixture() {
  let counter = 0
  return createEmptyDocument(
    { name: 'Test' },
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )
}

describe('migrateDocument', () => {
  it('passes a current-version document through unchanged', () => {
    const doc = fixture()
    expect(migrateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('throws when schemaVersion is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to omit
    const { schemaVersion, ...withoutVersion } = fixture()
    expect(() => migrateDocument(withoutVersion)).toThrowError(SchemaError)
    try {
      migrateDocument(withoutVersion)
    } catch (error) {
      expect((error as SchemaError).reason).toBe('missing-version')
    }
  })

  it('refuses a document written by a newer version of the app', () => {
    const doc = { ...fixture(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }
    try {
      migrateDocument(doc)
      throw new Error('expected migrateDocument to throw')
    } catch (error) {
      expect((error as SchemaError).reason).toBe('future-version')
    }
  })

  it('rejects a structurally invalid document', () => {
    const doc = { ...fixture(), personalia: { firstName: 'Ola' } }
    try {
      migrateDocument(doc)
      throw new Error('expected migrateDocument to throw')
    } catch (error) {
      expect((error as SchemaError).reason).toBe('invalid')
    }
  })

  it('rejects a non-object payload', () => {
    expect(() => migrateDocument('nope')).toThrowError(SchemaError)
  })
})

describe('safeMigrateDocument', () => {
  it('returns ok for a valid document', () => {
    const result = safeMigrateDocument(JSON.parse(JSON.stringify(fixture())))
    expect(result.ok).toBe(true)
  })

  it('returns the error instead of throwing for an invalid document', () => {
    const result = safeMigrateDocument({ schemaVersion: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe('invalid')
  })
})
