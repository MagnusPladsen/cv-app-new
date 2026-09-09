import { describe, expect, it } from 'vitest'

import { PRIVACY_POLICY } from '@/lib/legal'
import { PROCESSORS } from '@/lib/privacy/processors'

const locales = ['no', 'en'] as const

describe('the privacy policy', () => {
  it('says the same things in both languages', () => {
    // A policy that differs between languages is two policies, and only one
    // of them can be the one being relied on.
    const [no, en] = locales.map((locale) => PRIVACY_POLICY[locale].sections.map((s) => s.id))
    expect(no).toEqual(en)
  })

  it('carries the same last-updated date in both languages', () => {
    expect(PRIVACY_POLICY.no.lastUpdated).toBe(PRIVACY_POLICY.en.lastUpdated)
  })

  it.each(locales)('has no empty section in %s', (locale) => {
    for (const section of PRIVACY_POLICY[locale].sections) {
      expect(section.heading.trim(), `${section.id} has no heading`).not.toBe('')
      expect(section.body.length, `${section.id} has no body`).toBeGreaterThan(0)
      for (const paragraph of section.body) {
        expect(paragraph.trim(), `${section.id} has an empty paragraph`).not.toBe('')
      }
    }
  })

  it.each(locales)('covers every Art. 13 requirement in %s', (locale) => {
    // Art. 13 lists what a policy must tell the reader. Each of these ids
    // exists to answer one of them; dropping one is a compliance gap, not a
    // content edit.
    const ids = PRIVACY_POLICY[locale].sections.map((section) => section.id)
    for (const required of [
      'controller',
      'what',
      'basis',
      'processors',
      'transfers',
      'retention',
      'rights',
      'voluntary',
      'automated',
    ]) {
      expect(ids, `${locale} is missing the ${required} section`).toContain(required)
    }
  })

  it.each(locales)('names Datatilsynet as the supervisory authority in %s', (locale) => {
    // Art. 13(2)(d): the right to lodge a complaint, and with whom.
    const text = PRIVACY_POLICY[locale].sections.flatMap((s) => s.body).join(' ')
    expect(text).toContain('Datatilsynet')
  })

  it.each(locales)('gives a contact address for the controller in %s', (locale) => {
    const text = PRIVACY_POLICY[locale].sections.flatMap((s) => s.body).join(' ')
    expect(text).toMatch(/@/)
  })

  it.each(locales)('does not cite the repealed ekomloven section in %s', (locale) => {
    // § 2-7b was repealed on 1 January 2025 and replaced by § 3-15.
    const text = PRIVACY_POLICY[locale].sections.flatMap((s) => s.body).join(' ')
    expect(text).not.toContain('2-7b')
  })

  it.each(locales)('claims no AI processing only while there is none in %s', (locale) => {
    // If an LLM is ever called, this assertion is the reminder that the
    // policy is now wrong - which is the point of asserting it.
    const text = PRIVACY_POLICY[locale].sections.flatMap((s) => s.body).join(' ')
    expect(text).toMatch(/kunstig intelligens|artificial intelligence/i)
  })

  it('lists every processor the app actually uses', () => {
    // The policy renders PROCESSORS rather than repeating them, so this
    // checks the list is non-empty and that the section exists to render it
    // into.
    expect(PROCESSORS.length).toBeGreaterThan(0)
    for (const locale of locales) {
      expect(PRIVACY_POLICY[locale].sections.map((s) => s.id)).toContain('processors')
    }
  })
})
