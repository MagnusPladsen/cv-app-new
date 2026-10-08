import { describe, expect, it } from 'vitest'

import {
  buildFacts,
  chatTargets,
  collectPassages,
  prepareMessage,
  targetsFor,
} from '@/lib/ai/context'
import { factsSchema } from '@/lib/ai/tools'
import { getCvLabels } from '@/lib/cv-labels'
import { createDemoDocument } from '@/lib/schema/demo'

describe('what the browser works out before it asks', () => {
  it('sends measurements, not a document', () => {
    const facts = buildFacts(createDemoDocument(), 3)

    expect(factsSchema.safeParse(facts).success).toBe(true)
    expect(facts.pages).toBe(3)
    // A finding's `values` name the employer or the entry. The ids do not.
    for (const finding of facts.findings) {
      expect(Object.keys(finding).sort()).not.toContain('values')
    }
  })

  it('names the parts of the CV a suggestion may land in, never their contents', () => {
    const document = createDemoDocument()
    const targets = chatTargets(document, getCvLabels('no'), 'Tittel', 'Søknad')

    expect(targets.map((target) => target.kind)).toContain('field')
    for (const target of targets) {
      expect(target.label).not.toContain(document.personalia.firstName)
      expect(target.label).not.toContain(document.personalia.lastName)
    }
  })

  it('offers no summary target when the section is switched off', () => {
    const document = createDemoDocument()
    document.sections = document.sections.map((section) =>
      section.type === 'summary' ? { ...section, enabled: false } : section,
    )

    const targets = chatTargets(document, getCvLabels('no'), 'Tittel', 'Søknad')

    expect(targets.some((target) => target.kind === 'summary')).toBe(false)
  })

  it('refuses to send a question containing a national identity number', () => {
    expect(prepareMessage('Kan jeg skrive 010190 12345?', createDemoDocument())).toEqual({
      ok: false,
      reason: 'nationalId',
    })
  })

  it('refuses an empty question rather than paying for an answer to nothing', () => {
    expect(prepareMessage('   ', createDemoDocument())).toEqual({ ok: false, reason: 'empty' })
  })

  it('removes the person from the question before it leaves', () => {
    const document = createDemoDocument()
    const prepared = prepareMessage(
      `Jeg heter ${document.personalia.firstName} og bor i ${document.personalia.city}`,
      document,
    )

    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(prepared.message).not.toContain(document.personalia.firstName)
    expect(prepared.message).toContain('[navn]')
    expect(prepared.message).toContain('[sted]')
  })
})

describe('the CV text a review sends', () => {
  const labels = getCvLabels('no')
  const collect = (document = createDemoDocument()) =>
    collectPassages(document, labels, 'Tittel', 'Søknad')

  it('carries the text the assistant has to read to review anything', () => {
    const result = collect()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const kinds = new Set(result.passages.map((passage) => passage.kind))
    expect(kinds.has('summary')).toBe(true)
    expect(kinds.has('bullet')).toBe(true)
  })

  it('sends no employer, no date, no contact detail and no referee', () => {
    const document = createDemoDocument()
    const result = collect(document)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const everything = result.passages.map((passage) => `${passage.label} ${passage.text}`).join('\n')

    const references = document.sections.find((section) => section.type === 'references')
    const referee = references && 'entries' in references ? references.entries[0] : undefined

    for (const forbidden of [
      document.personalia.email,
      document.personalia.phone,
      document.personalia.firstName,
      ...document.sections
        .flatMap((section) =>
          'entries' in section && Array.isArray(section.entries)
            ? (section.entries as Record<string, unknown>[])
            : [],
        )
        .flatMap((entry) => [String(entry.organisation ?? ''), String(entry.from ?? '')]),
      referee && 'name' in referee ? (referee.name as string) : '',
    ].filter((value) => typeof value === 'string' && value.length > 2)) {
      expect(everything, `a review sent ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('refuses the whole review when a national identity number is anywhere in the CV', () => {
    const document = createDemoDocument()
    const summary = document.sections.find((section) => section.type === 'summary')!
    document.sections = document.sections.map((section) =>
      section.id === summary.id ? { ...section, text: 'Fnr 010190 12345' } : section,
    )

    expect(collect(document)).toEqual({ ok: false, reason: 'nationalId' })
  })

  it('stays bounded however long the CV is', () => {
    const result = collect()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.passages.length).toBeLessThanOrEqual(40)
    for (const passage of result.passages) expect(passage.text.length).toBeLessThanOrEqual(400)
  })

  it('lets a review suggest only into the passages it was given', () => {
    const result = collect()
    if (!result.ok) return
    const targets = targetsFor(result.passages)

    expect(targets.length).toBeGreaterThan(0)
    expect(targets.length).toBeLessThanOrEqual(20)
    for (const target of targets) {
      if (target.kind !== 'bullet') continue
      expect(
        result.passages.some(
          (passage) =>
            passage.kind === 'bullet' &&
            passage.sectionId === target.sectionId &&
            passage.index === target.index,
        ),
      ).toBe(true)
    }
  })

  it('says nothing to review when the CV is empty, rather than paying for silence', () => {
    const document = createDemoDocument()
    document.personalia = { ...document.personalia, title: '' }
    document.sections = []
    document.coverLetter = { ...document.coverLetter!, enabled: false }

    const result = collect(document)

    expect(result.ok && result.passages).toEqual([])
  })
})
