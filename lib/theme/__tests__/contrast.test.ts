import { describe, expect, it } from 'vitest'
import { contrastRatio, parseHex, pickInk, relativeLuminance } from '@/lib/theme/contrast'

describe('parseHex', () => {
  it('parses a six-digit hex', () => {
    expect(parseHex('#2563eb')).toEqual({ r: 0x25, g: 0x63, b: 0xeb })
  })

  it('expands a three-digit hex', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('tolerates a missing hash', () => {
    expect(parseHex('000000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('returns null for nonsense', () => {
    expect(parseHex('rebeccapurple')).toBeNull()
    expect(parseHex('#12345')).toBeNull()
  })
})

describe('relativeLuminance', () => {
  it('is 1 for white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('is 0 for black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('treats an unparseable colour as black', () => {
    expect(relativeLuminance('nope')).toBe(0)
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#2563eb', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#2563eb'),
      6,
    )
  })

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1, 6)
  })
})

describe('pickInk', () => {
  it('chooses dark ink on a bright yellow accent', () => {
    expect(pickInk('#ffe600')).toBe('#111111')
  })

  it('chooses light ink on a deep blue accent', () => {
    expect(pickInk('#1e3a8a')).toBe('#ffffff')
  })

  it('honours custom ink colours', () => {
    expect(pickInk('#ffe600', { dark: '#222', light: '#eee' })).toBe('#222')
  })

  it('falls back to dark ink for an unparseable accent', () => {
    expect(pickInk('nope')).toBe('#ffffff')
  })
})
