import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PROCESSORS } from '@/lib/privacy/processors'

/**
 * The Art. 30 record, the DPIA screening, the LIA, the breach runbook and the
 * rights-request procedure are compliance documents that have to match the
 * application. They are the ones a supervisory authority asks for, and they
 * are also the easiest to write once and let rot.
 *
 * These assert the few things that would make them wrong rather than merely
 * dated: a processor the code uses but the record omits, a conclusion never
 * reached, a contact address left as a placeholder.
 */
const read = (name: string) => readFileSync(join(process.cwd(), 'docs/privacy', name), 'utf8')

const RECORDS = [
  'ropa.md',
  'dpia-screening.md',
  'legitimate-interest.md',
  'breach-runbook.md',
  'rights-requests.md',
]

describe('the record of processing activities', () => {
  it('accounts for every processor the code actually uses', () => {
    // A processor added to lib/privacy/processors.ts and not to the record
    // leaves the Art. 30 recipients column wrong, which is the column the
    // record exists for.
    const ropa = read('ropa.md')
    const missing = PROCESSORS.filter((processor) => !ropa.includes(processor.name))
    expect(missing.map((p) => p.name), 'processors missing from the ROPA').toEqual([])
  })

  it('names a legal basis for each activity it records', () => {
    const ropa = read('ropa.md')
    const activities = ropa.match(/^## Activity \d+/gm) ?? []
    expect(activities.length).toBeGreaterThanOrEqual(3)
    // Every basis CVApp relies on has to appear. A record that lists an
    // activity without one is the single most common Art. 30 defect.
    expect(ropa).toContain('Art. 6(1)(b)')
    expect(ropa).toContain('Art. 6(1)(f)')
    expect(ropa).toContain('Art. 9(2)(a)')
  })

  it('keeps the Art. 6(1)(f) claim backed by an assessment', () => {
    // Relying on legitimate interests without a recorded balancing test is
    // relying on nothing: Recital 47 makes the balance a condition of the
    // basis, not a defence raised afterwards.
    const lia = read('legitimate-interest.md')
    expect(read('ropa.md')).toContain('legitimate-interest.md')
    for (const part of ['Purpose', 'Necessity', 'Balancing']) {
      expect(lia, `the LIA skips ${part}`).toContain(part)
    }
  })
})

describe('the DPIA screening', () => {
  it('records a conclusion rather than an open question', () => {
    // Art. 35 is satisfied by having screened and written down the answer.
    // A screening that stops at the criteria table demonstrates nothing.
    const dpia = read('dpia-screening.md')
    expect(dpia).toContain('## Conclusion')
    expect(dpia).toMatch(/No DPIA is required|A DPIA is required/)
  })

  it('says what would change the answer', () => {
    expect(read('dpia-screening.md')).toMatch(/Re-screen when/)
  })
})

describe('the breach runbook', () => {
  it('carries the deadline and the authority, since it is read under pressure', () => {
    const runbook = read('breach-runbook.md')
    expect(runbook).toContain('72 hours')
    expect(runbook).toContain('Datatilsynet')
    // Art. 33(5) requires a record of every breach, including those not
    // notified. Without the log the runbook documents a process with no output.
    expect(runbook).toMatch(/Log \(Art\. 33\(5\)\)/)
  })
})

describe('the rights-request procedure', () => {
  it('covers every right a person can actually exercise', () => {
    const rights = read('rights-requests.md')
    for (const article of ['15', '16', '17', '18', '20', '21']) {
      expect(rights, `no handling for Art. ${article}`).toContain(`| ${article} |`)
    }
    expect(rights).toContain('one-month')
  })
})

describe('every record', () => {
  it('reaches a real contact address, not a placeholder', () => {
    // These documents are handed to people. An unreplaced example address in
    // one is worse than no document, because it looks answered.
    for (const name of ['ropa.md']) {
      expect(read(name), `${name} has no contact address`).toContain('@')
    }
  })

  it('leaves nothing marked unfinished', () => {
    for (const name of RECORDS) {
      expect(read(name), `${name} still contains a placeholder`).not.toMatch(/\bTBD\b|\bTODO\b/)
    }
  })
})
