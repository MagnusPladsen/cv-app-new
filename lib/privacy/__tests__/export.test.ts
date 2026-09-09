import { describe, expect, it } from 'vitest'

import { buildPrivacyExport, privacyExportFilename } from '@/lib/privacy/export'
import { createEmptyDocument } from '@/lib/schema/defaults'

const doc = () => createEmptyDocument({ name: 'CV' }, { newId: () => 'id-1', now: () => 0 })

const account = { id: 'user-a', email: 'ola@example.no', provider: 'google' }

describe('buildPrivacyExport', () => {
  it('includes the account record, which the CV bundle alone does not', () => {
    const result = buildPrivacyExport({
      account,
      documents: [doc()],
      localSettings: {},
      now: new Date('2026-09-09T10:00:00Z'),
    })

    expect(result.account).toEqual(account)
    expect(result.documents).toHaveLength(1)
    expect(result.exportedAt).toBe('2026-09-09T10:00:00.000Z')
  })

  it('works for a signed-out user, who is still entitled to their data', () => {
    const result = buildPrivacyExport({ account: null, documents: [doc()], localSettings: {} })

    expect(result.account).toBeNull()
    expect(result.documents).toHaveLength(1)
  })

  it('carries the preferences held on the user behalf', () => {
    const result = buildPrivacyExport({
      account,
      documents: [],
      localSettings: { 'cvapp:guest-export:v1': '1' },
    })

    expect(result.localSettings).toEqual({ 'cvapp:guest-export:v1': '1' })
  })

  it('states the categories it holds none of, rather than omitting them silently', () => {
    // Art. 15 is about the person knowing what is held. An export that just
    // leaves out "usage data" is indistinguishable from one that forgot it.
    const notes = buildPrivacyExport({ account, documents: [], localSettings: {} }).notes.join(' ')

    expect(notes).toMatch(/no usage data/i)
    expect(notes).toMatch(/no stored version history/i)
    expect(notes).toMatch(/no consent records/i)
  })

  it('is machine-readable and self-describing, per Art. 20', () => {
    const result = buildPrivacyExport({ account, documents: [doc()], localSettings: {} })
    const round = JSON.parse(JSON.stringify(result))

    expect(round.format).toBe('cvapp-privacy-export')
    expect(round.formatVersion).toBe(1)
    expect(round.documents[0].id).toBe('id-1')
  })
})

describe('privacyExportFilename', () => {
  it('is dated', () => {
    expect(privacyExportFilename(new Date('2026-09-09T10:00:00Z'))).toBe(
      'CVApp_mine-data_2026-09-09.json',
    )
  })
})
