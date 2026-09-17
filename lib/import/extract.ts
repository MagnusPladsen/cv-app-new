import type { Line } from './parse-cv'

/**
 * One way in for every file somebody might pick: work out what it is from its
 * first bytes, then hand it to the reader for that format.
 *
 * The bytes rather than the name, because a CV saved as "cv.pdf" is not
 * always a PDF, and a download can arrive with no extension at all.
 */

export type ImportFailure =
  /** A PDF with no text in it - a scan. */
  | 'no-text'
  /** Looked like a format we read, and could not be read. */
  | 'unreadable'
  /** A Word 97-2003 .doc, which is a different format from .docx. */
  | 'old-word'
  /** Not a PDF and not a Word document. */
  | 'unsupported'

export type Extraction = { ok: true; lines: Line[] } | { ok: false; reason: ImportFailure }

export type FileKind = 'pdf' | 'docx' | 'old-word' | 'unknown'

/** The accept list for the file picker. */
export const IMPORT_ACCEPT = [
  'application/pdf',
  '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.docx',
  'application/msword',
  '.doc',
].join(',')

export function detectKind(bytes: Uint8Array): FileKind {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
  // "%PDF", though some producers put junk before it, so look a little way in.
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024))
  if (head.includes('%PDF-')) return 'pdf'
  if (starts(0x50, 0x4b, 0x03, 0x04)) return 'docx'
  // The OLE compound file header every pre-2007 Office document starts with.
  if (starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) return 'old-word'
  return 'unknown'
}

export async function extractLines(file: ArrayBuffer): Promise<Extraction> {
  const kind = detectKind(new Uint8Array(file))

  // Each reader is loaded only when a file of its kind turns up: pdf.js alone
  // is about 400 KiB.
  if (kind === 'pdf') {
    const { pdfToLines } = await import('./pdf-lines')
    const result = await pdfToLines(file)
    return result.ok ? { ok: true, lines: result.lines } : result
  }
  if (kind === 'docx') {
    const { docxToLines } = await import('./docx-lines')
    return docxToLines(file)
  }
  if (kind === 'old-word') return { ok: false, reason: 'old-word' }
  return { ok: false, reason: 'unsupported' }
}
