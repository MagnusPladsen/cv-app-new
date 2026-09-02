import { describe, expect, it } from 'vitest'

import { createEmptyDocument } from '@/lib/schema/defaults'
import { backupFilename, parseBackup, serialiseDocument } from '@/lib/store/backup'

function fixture() {
  let counter = 0
  const doc = createEmptyDocument(
    { name: 'Frontend' },
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )
  doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }
  return doc
}

describe('serialiseDocument', () => {
  it('produces readable JSON', () => {
    expect(serialiseDocument(fixture())).toContain('\n  "id"')
  })

  it('round-trips through parseBackup', () => {
    const doc = fixture()
    const result = parseBackup(serialiseDocument(doc))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.document).toEqual(doc)
  })
})

describe('backupFilename', () => {
  it('includes the name and the date', () => {
    expect(backupFilename(fixture(), new Date('2026-09-02T10:00:00Z'))).toBe(
      'Ola_Nordmann_CV_2026-09-02.json',
    )
  })

  it('falls back when there is no name', () => {
    const doc = fixture()
    doc.personalia = { ...doc.personalia, firstName: '', lastName: '' }
    expect(backupFilename(doc, new Date('2026-09-02T10:00:00Z'))).toBe('CV_2026-09-02.json')
  })
})

describe('parseBackup', () => {
  it('reports malformed JSON rather than throwing', () => {
    const result = parseBackup('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe('invalid')
  })

  it('reports a structurally invalid document', () => {
    const result = parseBackup(JSON.stringify({ schemaVersion: 1, id: 'x' }))
    expect(result.ok).toBe(false)
  })

  it('reports a document from a newer schema version', () => {
    const doc = { ...fixture(), schemaVersion: 999 }
    const result = parseBackup(JSON.stringify(doc))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe('future-version')
  })

  it('accepts an empty object as invalid, not as a document', () => {
    expect(parseBackup('{}').ok).toBe(false)
  })
})
