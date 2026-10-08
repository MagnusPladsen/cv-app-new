import { describe, expect, it } from 'vitest'

import { buildFacts, chatTargets, prepareMessage } from '@/lib/ai/context'
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
