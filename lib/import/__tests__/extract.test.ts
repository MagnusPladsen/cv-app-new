import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { detectKind, extractLines } from '@/lib/import/extract'

describe('telling files apart', () => {
  it('knows a PDF by its signature, even behind a little junk', () => {
    expect(detectKind(strToU8('%PDF-1.7\n'))).toBe('pdf')
    expect(detectKind(strToU8('\n\n%PDF-1.4'))).toBe('pdf')
  })

  it('knows a Word document is a zip', () => {
    expect(detectKind(zipSync({ 'word/document.xml': strToU8('<x/>') }))).toBe('docx')
  })

  it('knows an old .doc, so it can say what to do about it', () => {
    const header = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
    expect(detectKind(header)).toBe('old-word')
  })

  it('does not guess at anything else', () => {
    expect(detectKind(strToU8('Ola Nordmann, frontendutvikler'))).toBe('unknown')
    expect(detectKind(new Uint8Array())).toBe('unknown')
  })
})

describe('extracting', () => {
  it('turns an old .doc away with its own reason', async () => {
    const header = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    expect(await extractLines(header.buffer)).toEqual({ ok: false, reason: 'old-word' })
  })

  it('turns an image or text file away', async () => {
    expect(await extractLines(strToU8('hei').buffer as ArrayBuffer)).toEqual({
      ok: false,
      reason: 'unsupported',
    })
  })
})
