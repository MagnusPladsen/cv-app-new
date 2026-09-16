import type { Line } from './parse-cv'

/**
 * Turning a PDF into the lines a person sees.
 *
 * pdf.js hands back text in the order the file happens to store it, as
 * fragments with a position. That is not reading order and not lines, so both
 * have to be rebuilt: group fragments that share a baseline, then sort.
 *
 * Everything happens in the browser. The file is never uploaded, which is the
 * whole reason this feature can exist here - every other CV builder parses
 * uploads on a server.
 */

export type PdfExtraction =
  | { ok: true; lines: Line[]; pages: number }
  | { ok: false; reason: 'no-text' | 'unreadable' }

type Fragment = { text: string; x: number; y: number; size: number; width: number }

/** Baselines within this many points are the same line. */
const LINE_TOLERANCE = 2.5

/** A gap wider than this is a column break, not a word space. */
const COLUMN_GAP = 60

/**
 * A gap narrower than this share of the type size is inside a word.
 *
 * Letter-spaced headings - which every CV template in this app uses, and most
 * elsewhere do too - arrive from pdf.js as one fragment per character. Joining
 * those with spaces turns "OM MEG" into "O M M E G", no heading is recognised,
 * and with no sections there are no jobs and no education either. One
 * character of tracking is still far narrower than a word space.
 */
const WORD_GAP_RATIO = 0.28

function toLines(fragments: Fragment[]): Line[] {
  const rows: Fragment[][] = []

  // Top to bottom. pdf.js y grows upwards, so the sort is descending.
  for (const fragment of [...fragments].sort((a, b) => b.y - a.y)) {
    const row = rows[rows.length - 1]
    const last = row?.[0]
    if (row && last && Math.abs(last.y - fragment.y) <= LINE_TOLERANCE) row.push(fragment)
    else rows.push([fragment])
  }

  const lines: Line[] = []

  for (const row of rows) {
    const ordered = [...row].sort((a, b) => a.x - b.x)

    // A wide horizontal gap means these fragments are not one sentence: they
    // are two columns that happen to share a baseline. Split, so a sidebar
    // heading does not end up glued to a paragraph of the main column.
    let group: Fragment[] = []
    const groups: Fragment[][] = []

    for (const fragment of ordered) {
      const previous = group[group.length - 1]
      if (previous && fragment.x - (previous.x + previous.width) > COLUMN_GAP) {
        groups.push(group)
        group = []
      }
      group.push(fragment)
    }
    if (group.length > 0) groups.push(group)

    for (const part of groups) {
      const text = part
        .map((fragment, index) => {
          const previous = part[index - 1]
          if (!previous) return fragment.text
          const gap = fragment.x - (previous.x + previous.width)
          // Already spaced by the producer, or close enough to be one word.
          if (/\s$/.test(previous.text) || /^\s/.test(fragment.text)) return fragment.text
          return gap > previous.size * WORD_GAP_RATIO ? ` ${fragment.text}` : fragment.text
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
      if (!text) continue
      lines.push({
        text,
        // The largest fragment on the line: a heading is a heading even when
        // it ends in a small footnote mark.
        size: Math.max(...part.map((fragment) => fragment.size)),
      })
    }
  }

  return lines
}

/**
 * Reads a PDF into lines. `pdfjs-dist` is imported here rather than at the
 * top of the module so that the 400 KiB of it is fetched when somebody
 * actually drops a file, and never otherwise.
 */
export async function pdfToLines(file: ArrayBuffer): Promise<PdfExtraction> {
  try {
    const pdfjs = await import('pdfjs-dist')

    // The worker ships with the package and is served from our own origin,
    // which is what the production CSP allows. A CDN would be blocked.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()

    // No eval option needed: pdf.js 6 contains no `new Function(` at all,
    // which matters because the production CSP has no 'unsafe-eval'. Check
    // that again on a major upgrade rather than assuming it holds.
    const document = await pdfjs.getDocument({ data: new Uint8Array(file) }).promise

    const fragments: Fragment[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()

      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue
        // transform is [a, b, c, d, e, f]: e and f are the position, and d is
        // the vertical scale, which is the rendered type size.
        const [, , , scale, x, y] = item.transform as number[]
        const size = Math.abs(scale ?? 10)
        fragments.push({
          text: item.str,
          x: x ?? 0,
          // Pages stack, so later pages sort below earlier ones.
          y: (y ?? 0) - pageNumber * 100_000,
          size,
          // pdf.js measures the advance width for us. Estimating it from the
          // character count is what made letter-spaced text unreadable.
          width: item.width ?? item.str.length * size * 0.5,
        })
      }
    }

    if (fragments.length === 0) {
      // A scan. There is no text to read, and guessing at one needs OCR.
      return { ok: false, reason: 'no-text' }
    }

    return { ok: true, lines: toLines(fragments), pages: document.numPages }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
