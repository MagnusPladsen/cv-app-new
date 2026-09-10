import { describe, expect, it } from 'vitest'

import { nameScale } from '@/components/cv/PersonaliaHeader'

describe('nameScale', () => {
  it('leaves an ordinary name alone', () => {
    expect(nameScale('Ola Nordmann')).toBe(1)
    expect(nameScale('Magnus Pladsen')).toBe(1)
  })

  it('shrinks a long name rather than letting it wrap first', () => {
    // The name is the most important thing on a CV. In a 62mm sidebar it was
    // breaking across lines the moment it stopped fitting.
    const long = nameScale('Ingrid Bjørnstad Halvorsen')
    expect(long).toBeLessThan(1)
    expect(long).toBeGreaterThan(0.72)
  })

  it('stops shrinking at a readable floor', () => {
    // Below this it stops reading as the page's title, and wrapping is the
    // better of the two compromises.
    expect(nameScale('A'.repeat(60))).toBe(0.72)
  })

  it('never grows a short name', () => {
    expect(nameScale('Ida Ek')).toBe(1)
    expect(nameScale('')).toBe(1)
  })

  it('is monotonic, so a longer name is never larger', () => {
    let previous = 1
    for (let length = 10; length <= 50; length += 1) {
      const scale = nameScale('x'.repeat(length))
      expect(scale).toBeLessThanOrEqual(previous)
      previous = scale
    }
  })

  it('returns a stable rounded value, so snapshots do not drift', () => {
    expect(nameScale('x'.repeat(26))).toBe(0.86)
  })
})
