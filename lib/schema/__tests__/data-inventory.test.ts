import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { cvDocumentSchema } from '@/lib/schema/cv'
import { collectFieldPaths } from '@/lib/schema/field-paths'

const inventory = readFileSync('docs/privacy/data-inventory.md', 'utf8')

/** Field paths named in the first column of a markdown table row. */
function documentedFields(markdown: string): Set<string> {
  const rows = markdown.split('\n').filter((line) => line.startsWith('| `'))
  return new Set(rows.map((line) => line.split('|')[1]!.trim().replaceAll('`', '')))
}

describe('the data inventory', () => {
  it('lists every field the CV schema stores', () => {
    // GDPR Art. 30 and the spec's §2: a stored field that is not inventoried
    // is a field nobody decided a purpose, a legal basis or a retention
    // period for. Adding one must fail here until it is documented.
    const documented = documentedFields(inventory)
    const missing = collectFieldPaths(cvDocumentSchema).filter((path) => !documented.has(path))

    expect(missing, `undocumented fields: ${missing.join(', ')}`).toEqual([])
  })

  it('documents nothing that no longer exists', () => {
    // The other direction matters too: an inventory that over-claims tells
    // a reader the app holds data it does not.
    const actual = new Set(collectFieldPaths(cvDocumentSchema))
    const stale = [...documentedFields(inventory)].filter((path) => !actual.has(path))

    expect(stale, `inventory lists fields that do not exist: ${stale.join(', ')}`).toEqual([])
  })

  it('never gains a national identity number', () => {
    // Spec §11: no lawful need for one here, and personopplysningsloven § 12
    // attaches extra obligations to it. A floor, not a preference.
    const banned = /f(ø|o)dselsnummer|nationalId|personnummer|\bssn\b|socialSecurity/i
    const offending = collectFieldPaths(cvDocumentSchema).filter((path) => banned.test(path))

    expect(offending).toEqual([])
  })

  it('stores no date of birth', () => {
    // Removed deliberately: it was in the schema but had no editor field and
    // no renderer, so nothing could set or show it. Spec §11 is collect only
    // what the feature needs. If it returns, it returns with a UI and a row
    // in the inventory.
    expect(collectFieldPaths(cvDocumentSchema)).not.toContain('personalia.birthDate')
  })

  it('creates no structured field for special-category data', () => {
    // Spec §3: free-text fields may contain anything, and that is the user's
    // choice. A structured field would mean CVApp asking for it.
    const banned = /health|helse|religion|ethnic|etnisit|politic|politisk|union|fagforening|disabilit/i
    const offending = collectFieldPaths(cvDocumentSchema).filter((path) => banned.test(path))

    expect(offending).toEqual([])
  })

  it('names the controller, which Art. 13 requires the policy to identify', () => {
    expect(inventory).toContain('magnus_pladsen@hotmail.com')
  })
})
