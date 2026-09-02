import { describe, expect, it } from 'vitest'

import { contentHeightMm } from '@/lib/print/measure'
import { countPages, mmToPx, usableHeightMm } from '@/lib/print/paper'

/** An empty A4 CV: min-height is a full page, with 16mm padding each end. */
const EMPTY_A4 = {
  element: { scrollHeight: mmToPx(297) },
  style: { paddingTop: `${mmToPx(16)}px`, paddingBottom: `${mmToPx(16)}px` },
}

describe('contentHeightMm', () => {
  it('subtracts the vertical padding', () => {
    expect(contentHeightMm(EMPTY_A4.element, EMPTY_A4.style)).toBeCloseTo(297 - 32, 4)
  })

  it('reports exactly one page for an empty A4 CV', () => {
    const height = contentHeightMm(EMPTY_A4.element, EMPTY_A4.style)
    expect(countPages(height, 'a4')).toBe(1)
    expect(height).toBeCloseTo(usableHeightMm('a4'), 4)
  })

  it('reports two pages once the content overflows', () => {
    const height = contentHeightMm(
      { scrollHeight: mmToPx(297 + 50) },
      EMPTY_A4.style,
    )
    expect(countPages(height, 'a4')).toBe(2)
  })

  it('treats unparseable padding as zero', () => {
    expect(
      contentHeightMm({ scrollHeight: mmToPx(100) }, { paddingTop: 'auto', paddingBottom: '' }),
    ).toBeCloseTo(100, 4)
  })

  it('never returns a negative height', () => {
    expect(
      contentHeightMm({ scrollHeight: 10 }, { paddingTop: '100px', paddingBottom: '100px' }),
    ).toBe(0)
  })
})
