import { describe, expect, it } from 'vitest'

import { toFragments } from '@/lib/import/ocr'
import { pageToLines } from '@/lib/import/pdf-lines'

/**
 * The engine itself is WebAssembly and a 4 MB language model, which belongs
 * in a browser and not in a unit test. What is worth testing here is the step
 * that turns what it returns into the same shape a PDF produces, because
 * everything downstream - lines, columns, headings - depends on it.
 */

const word = (text: string, x: number, top: number, height = 20) => ({
  text,
  bbox: { x0: x, y0: top, x1: x + text.length * height * 0.5, y1: top + height },
})

describe('what the OCR read, as a page', () => {
  it('turns words into fragments the PDF reader understands', () => {
    // Recognition counts from the top of the image and at twice the scale;
    // a PDF counts upwards from the bottom, in points.
    const [fragment] = toFragments([word('Kari', 100, 80, 40)], 1684)
    expect(fragment).toMatchObject({ text: 'Kari', x: 50, y: 782, size: 20 })
  })

  it('reads a page of recognised words back in reading order', () => {
    const words = [
      word('Kari', 120, 60, 48),
      word('Nordmann', 300, 60, 48),
      word('Arbeidserfaring', 120, 300, 28),
      word('Utvikler,', 120, 360),
      word('Acme', 260, 360),
    ]
    const fragments = toFragments(words, 1684)
    const lines = pageToLines({ width: 595, fragments }).map((line) => line.text)
    expect(lines).toEqual(['Kari Nordmann', 'Arbeidserfaring', 'Utvikler, Acme'])
  })

  it('leaves out the empty boxes recognition returns', () => {
    expect(toFragments([word(' ', 10, 10), word('Ola', 40, 10)], 1000)).toHaveLength(1)
  })
})
