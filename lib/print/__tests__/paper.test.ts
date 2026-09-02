import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MARGIN_MM,
  PAPER,
  countPages,
  mmToPx,
  pageBreakOffsetsMm,
  pxToMm,
  usableHeightMm,
} from '@/lib/print/paper'

describe('PAPER', () => {
  it('uses ISO A4 dimensions', () => {
    expect(PAPER.a4).toMatchObject({ widthMm: 210, heightMm: 297, cssSize: 'A4' })
  })

  it('uses US Letter dimensions', () => {
    expect(PAPER.letter).toMatchObject({ widthMm: 215.9, heightMm: 279.4, cssSize: 'Letter' })
  })
})

describe('unit conversion', () => {
  it('converts one inch to 96 CSS pixels', () => {
    expect(mmToPx(25.4)).toBeCloseTo(96, 6)
  })

  it('round-trips', () => {
    expect(pxToMm(mmToPx(123.4))).toBeCloseTo(123.4, 6)
  })
})

describe('usableHeightMm', () => {
  it('subtracts the margin from both ends', () => {
    expect(usableHeightMm('a4', 16)).toBeCloseTo(297 - 32, 6)
  })

  it('defaults to the standard margin', () => {
    expect(usableHeightMm('a4')).toBeCloseTo(297 - DEFAULT_MARGIN_MM * 2, 6)
  })
})

describe('countPages', () => {
  it('is 1 for empty content', () => {
    expect(countPages(0, 'a4')).toBe(1)
  })

  it('is 1 for content that exactly fills the usable height', () => {
    expect(countPages(usableHeightMm('a4'), 'a4')).toBe(1)
  })

  it('is 2 when content just overflows', () => {
    expect(countPages(usableHeightMm('a4') + 1, 'a4')).toBe(2)
  })

  it('absorbs the sub-pixel rounding of an integer scrollHeight', () => {
    // A browser reports a 297mm page as 1123px, overshooting by ~0.13mm.
    expect(countPages(usableHeightMm('a4') + 0.13, 'a4')).toBe(1)
  })

  it('still counts a real overflow of one line of text', () => {
    expect(countPages(usableHeightMm('a4') + 4, 'a4')).toBe(2)
  })

  it('is 3 for content just over two pages', () => {
    expect(countPages(usableHeightMm('a4') * 2 + 1, 'a4')).toBe(3)
  })

  it('accounts for the shorter Letter page', () => {
    const height = usableHeightMm('letter') + 1
    expect(countPages(height, 'letter')).toBe(2)
  })

  it('never returns less than 1 for negative input', () => {
    expect(countPages(-50, 'a4')).toBe(1)
  })
})

describe('pageBreakOffsetsMm', () => {
  it('returns no offsets for a single page', () => {
    expect(pageBreakOffsetsMm(50, 'a4')).toEqual([])
  })

  it('returns one offset for two pages', () => {
    const offsets = pageBreakOffsetsMm(usableHeightMm('a4') + 10, 'a4')
    expect(offsets).toHaveLength(1)
    expect(offsets[0]).toBeCloseTo(usableHeightMm('a4'), 6)
  })

  it('returns evenly spaced offsets for three pages', () => {
    const usable = usableHeightMm('a4')
    const offsets = pageBreakOffsetsMm(usable * 2 + 10, 'a4')
    expect(offsets).toHaveLength(2)
    expect(offsets[1]! - offsets[0]!).toBeCloseTo(usable, 6)
  })
})
