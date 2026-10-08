import { describe, expect, it } from 'vitest'

import { scrub } from '@/lib/ai/redact'
import { createDemoDocument } from '@/lib/schema/demo'

const personalia = () => createDemoDocument().personalia

describe('scrubbing text before it leaves the browser', () => {
  it('refuses outright when a national identity number is present', () => {
    // Masking one would be worse than stopping: the person needs to know it
    // is in their CV.
    for (const text of ['Fødselsnummer 010190 12345', 'fnr: 01019012345', '010190-12345']) {
      expect(scrub(text, personalia()), text).toEqual({ ok: false, reason: 'nationalId' })
    }
  })

  it('leaves an ordinary phone number alone', () => {
    const result = scrub('Ring meg på 98765432', { ...personalia(), phone: '' })
    expect(result.ok).toBe(true)
  })

  it('replaces the name, email, phone and place the person typed', () => {
    const person = personalia()
    const text = `${person.firstName} ${person.lastName} bor i ${person.city}. E-post: ${person.email}, telefon ${person.phone}.`

    const result = scrub(text, person)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.text).not.toContain(person.firstName)
    expect(result.text).not.toContain(person.lastName)
    expect(result.text).not.toContain(person.email)
    expect(result.text).not.toContain(person.phone)
    expect(result.text).not.toContain(person.city)
    expect(result.text).toContain('[navn]')
    expect(result.text).toContain('[e-post]')
  })

  it('collapses a full name into one placeholder', () => {
    const person = personalia()
    const result = scrub(`${person.firstName} ${person.lastName} er utvikler`, person)

    expect(result.ok && result.text).toBe('[navn] er utvikler')
  })

  it('ignores a value too short to mask without wrecking the text', () => {
    // A one-letter city would turn every such letter into "[sted]".
    const result = scrub('Jeg leder et team', { ...personalia(), city: 'e' })

    expect(result.ok && result.text).toBe('Jeg leder et team')
  })

  it('matches regardless of case, because people type their own name both ways', () => {
    const result = scrub('kari er flink', { ...personalia(), firstName: 'Kari' })

    expect(result.ok && result.text).toBe('[navn] er flink')
  })
})
