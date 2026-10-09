import { describe, expect, it } from 'vitest'

import { KNOWLEDGE } from '@/lib/ai/knowledge'
import { GUIDE } from '@/lib/guide'

const locales = ['no', 'en'] as const

describe('the CV guide', () => {
  it('covers the same sections in both languages', () => {
    // Two languages with different sections is two guides, and only one of
    // them is the one somebody is reading.
    const [no, en] = locales.map((locale) => GUIDE[locale].sections.map((s) => s.id))
    expect(no).toEqual(en)
  })

  it.each(locales)('has no empty heading, paragraph or answer in %s', (locale) => {
    const guide = GUIDE[locale]
    expect(guide.title.trim()).not.toBe('')
    expect(guide.lede.trim()).not.toBe('')

    for (const section of guide.sections) {
      expect(section.heading.trim(), `${section.id} has no heading`).not.toBe('')
      expect(section.body.length, `${section.id} has no body`).toBeGreaterThan(0)
      for (const paragraph of section.body) expect(paragraph.trim()).not.toBe('')
    }

    for (const entry of guide.faq) {
      expect(entry.question.trim()).not.toBe('')
      expect(entry.answer.trim()).not.toBe('')
    }
  })

  it.each(locales)('answers enough questions to be worth marking up in %s', (locale) => {
    // The FAQPage structured data is only useful with real breadth, and
    // Google's guidelines require every marked-up answer to be visible on the
    // page - which it is, because the page renders this same list.
    expect(GUIDE[locale].faq.length).toBeGreaterThanOrEqual(10)
  })

  it.each(locales)('keeps the fødselsnummer warning in %s', (locale) => {
    // The one piece of advice on this page where being wrong costs somebody
    // their identity rather than an interview.
    const text = GUIDE[locale].sections.flatMap((s) => s.body).join(' ')
    expect(text).toContain('fødselsnummer')
  })

  it('does not contradict what the assistant is told', () => {
    // The guide and lib/ai/knowledge.ts are the same advice for two readers.
    // If the page says one page and the assistant says two, one of them is
    // wrong in front of a user.
    const guide = [
      ...GUIDE.no.sections.flatMap((s) => s.body),
      ...GUIDE.no.faq.map((f) => f.answer),
    ].join(' ')

    for (const claim of ['fødselsnummer', 'nedbemanning', 'forespørsel']) {
      expect(KNOWLEDGE, `knowledge.ts dropped ${claim}`).toContain(claim)
      expect(guide, `the guide dropped ${claim}`).toContain(claim)
    }
  })
})
