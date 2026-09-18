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

export type Fragment = { text: string; x: number; y: number; size: number; width: number }

export type PdfPage = { width: number; fragments: Fragment[] }

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

/** The narrowest strip of empty paper that counts as a gutter, in points. */
const MIN_GUTTER = 14

/** Fewer lines than this on one side is not a column. */
const MIN_COLUMN_ROWS = 4

/** Joins one visual row's fragments into text, splitting at wide gaps. */
function rowToLines(row: Fragment[]): Line[] {
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

  const lines: Line[] = []

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

  return lines
}

/** Groups fragments that share a baseline, top of the page first. */
function toRows(fragments: Fragment[]): Fragment[][] {
  const rows: Fragment[][] = []

  // pdf.js y grows upwards, so the sort is descending.
  for (const fragment of [...fragments].sort((a, b) => b.y - a.y)) {
    const row = rows[rows.length - 1]
    const last = row?.[0]
    if (row && last && Math.abs(last.y - fragment.y) <= LINE_TOLERANCE) row.push(fragment)
    else rows.push([fragment])
  }

  return rows
}

export type Gutter = { from: number; to: number; middle: number }

/**
 * Whether a row is set across both columns rather than in one: a name over
 * the whole page, or a contact line spread along the top.
 *
 * Either a fragment runs over the middle of the gutter, or fragments from
 * both sides reach into it. Reaching in from one side is not enough - a long
 * email address in a sidebar pokes into the gutter without leaving its column.
 * Only the middle half of the strip counts, because its edges are ragged.
 */
function spansColumns(row: Fragment[], gutter: Gutter): boolean {
  const quarter = (gutter.to - gutter.from) / 4
  const intrudes = (fragment: Fragment) =>
    fragment.x < gutter.to - quarter && fragment.x + fragment.width > gutter.from + quarter

  if (row.some((fragment) => fragment.x < gutter.middle && fragment.x + fragment.width > gutter.middle)) {
    return true
  }
  const reaching = row.filter(intrudes)
  return (
    reaching.some((fragment) => fragment.x < gutter.middle) &&
    reaching.some((fragment) => fragment.x >= gutter.middle)
  )
}

/**
 * Where a page divides into two columns, or null when it does not.
 *
 * A CV with a sidebar comes out of pdf.js as one list of fragments, and
 * sorting that list by height interleaves the columns line by line: a skill
 * from the sidebar, then half a sentence about a job, then a language. Read
 * that way nothing parses.
 *
 * The gutter is found as a vertical strip of paper that almost no row of text
 * touches. "Almost", because a name or a contact line across the top of the
 * page runs straight over it.
 *
 * The hard case is the one that looks the same and is not: dates in a narrow
 * left column beside each job, which is how this app's own Register template
 * is set. There the two sides share their baselines - every date sits level
 * with its job title - and reading the columns one after the other would
 * separate every job from its dates. Sidebars are set independently, so their
 * baselines line up only by chance. That is the test.
 */
export type LayoutOptions = {
  /**
   * Fragments that each stand for a block of several lines, as a Word text
   * box does. Line spacing says nothing about such rows, so the sparse-label
   * test is skipped.
   */
  blocks?: boolean
}

export type Layout =
  /** Two columns of content, read one after the other. */
  | { kind: 'columns'; gutter: Gutter }
  /**
   * A narrow column of section names beside the content, as this app's own
   * Register template sets it. Read as one column, but the labels are lifted
   * back above the entry they belong to.
   */
  | { kind: 'labels'; gutter: Gutter }

export function findLayout(
  rows: Fragment[][],
  width: number,
  options: LayoutOptions = {},
): Layout | null {
  if (rows.length < 8 || width <= 0) return null

  const bins = new Array<number>(Math.ceil(width)).fill(0)
  for (const row of rows) {
    const touched = new Set<number>()
    for (const fragment of row) {
      const from = Math.max(0, Math.floor(fragment.x))
      const to = Math.min(bins.length - 1, Math.ceil(fragment.x + fragment.width))
      for (let x = from; x <= to; x += 1) touched.add(x)
    }
    for (const x of touched) bins[x] = (bins[x] ?? 0) + 1
  }

  // A header - name, title, a line or two of contact details - can run
  // across the gutter, and is often four or five rows deep. Capped by the
  // page's size, or on a short page a whole column would count as blank.
  const allowed = Math.max(2, Math.min(5, Math.floor(rows.length * 0.1)))
  let best: { from: number; to: number } | null = null
  let runStart = -1

  // A gutter has a column of text on both sides. Without this the blank
  // paper to the right of a page of short lines is the widest empty strip
  // there is.
  const inColumn = (count: number) => count >= MIN_COLUMN_ROWS
  const firstText = bins.findIndex(inColumn)
  const lastText = bins.findLastIndex(inColumn)
  const printed = (x: number) => (bins[x] ?? 0) > allowed

  const lo = Math.floor(width * 0.2)
  const hi = Math.ceil(width * 0.8)
  for (let x = lo; x <= hi; x += 1) {
    const empty = x < hi && !printed(x)
    if (empty && runStart < 0) runStart = x
    if (!empty && runStart >= 0) {
      const bounded = runStart > firstText && x <= lastText
      if (bounded && (!best || x - runStart > best.to - best.from)) best = { from: runStart, to: x }
      runStart = -1
    }
  }

  if (!best || best.to - best.from < MIN_GUTTER) return null
  const gutter: Gutter = { ...best, middle: (best.from + best.to) / 2 }

  let shared = 0
  const leftY: number[] = []
  const rightY: number[] = []
  for (const row of rows) {
    if (spansColumns(row, gutter)) continue
    const y = row[0]!.y
    const hasLeft = row.some((fragment) => fragment.x < gutter.middle)
    const hasRight = row.some((fragment) => fragment.x > gutter.middle)
    if (hasLeft) leftY.push(y)
    if (hasRight) rightY.push(y)
    if (hasLeft && hasRight) shared += 1
  }

  const left = leftY.length
  const right = rightY.length
  if (left < MIN_COLUMN_ROWS || right < MIN_COLUMN_ROWS) return null

  const labels = (): Layout => ({ kind: 'labels', gutter })

  // A column of section names beside the content is sparse: one label, then
  // a long way down to the next. Its lines sit far further apart than the
  // content's, which a sidebar's do not.
  const spacing = (ys: number[]) => {
    const gaps = ys.slice(1).map((y, index) => ys[index]! - y).sort((a, b) => a - b)
    return gaps[Math.floor(gaps.length / 2)] ?? 0
  }
  const leftSpacing = spacing(leftY)
  const rightSpacing = spacing(rightY)
  if (
    !options.blocks &&
    Math.max(leftSpacing, rightSpacing) > 3 * Math.min(leftSpacing, rightSpacing)
  ) {
    return leftSpacing > rightSpacing ? labels() : null
  }
  // Independent columns still line up by chance - a sidebar on a 27pt rhythm
  // meets a main column on 16pt about every other line. A label column
  // lines up almost always.
  if (shared / Math.min(left, right) > 0.75) return null

  return { kind: 'columns', gutter }
}

/** How far a label may sit below the entry it names, in points. */
const LABEL_REACH = 18

/**
 * Puts a column of section names back above what they name.
 *
 * A label is typeset to sit level with the first line beside it, and a couple
 * of points lower as often as not - which sorts it *after* that line. Read
 * that way, every section's heading lands inside the section above it, and
 * the first job of each section goes with the wrong one.
 */
function liftLabels(rows: Fragment[][], gutter: Gutter): Fragment[][] {
  const ordered: Fragment[][] = []

  for (const row of rows) {
    // Where it starts, not where it ends: a long label - a letter-spaced
    // "A R B E I D S E R FA R I N G" - runs into the gutter without being
    // anything but a label.
    const isLabel = row.every((fragment) => fragment.x < gutter.middle)
    if (!isLabel) {
      ordered.push(row)
      continue
    }

    // Take back the content rows this label belongs above.
    const moved: Fragment[][] = []
    while (ordered.length > 0) {
      const last = ordered[ordered.length - 1]!
      if (Math.abs(last[0]!.y - row[0]!.y) > LABEL_REACH) break
      moved.unshift(ordered.pop()!)
    }
    ordered.push(row, ...moved)
  }

  return ordered
}

/** One page's lines in reading order. */
export function pageToLines(page: PdfPage, options: LayoutOptions = {}): Line[] {
  const rows = toRows(page.fragments)
  const layout = findLayout(rows, page.width, options)
  if (layout === null) return rows.flatMap(rowToLines)
  if (layout.kind === 'labels') return liftLabels(rows, layout.gutter).flatMap(rowToLines)
  const { gutter } = layout

  const lines: Line[] = []
  let leftRows: Fragment[][] = []
  let rightRows: Fragment[][] = []

  // Rows that run across the gutter - a name, a contact line - cut the page
  // into bands. Within a band the left column is read to the bottom before
  // the right one starts.
  const flush = () => {
    const both = leftRows.length > 0 && rightRows.length > 0
    for (const column of [leftRows, rightRows]) {
      const columnLines = column.flatMap(rowToLines)
      // Marked so the parser does not carry the last section of one column
      // into the top of the next: the sidebar's languages are not more jobs.
      if (both && columnLines[0]) columnLines[0] = { ...columnLines[0], columnStart: true }
      lines.push(...columnLines)
    }
    leftRows = []
    rightRows = []
  }

  for (const row of rows) {
    if (spansColumns(row, gutter)) {
      flush()
      lines.push(...rowToLines(row))
      continue
    }
    const left = row.filter((fragment) => fragment.x < gutter.middle)
    const right = row.filter((fragment) => fragment.x >= gutter.middle)
    if (left.length > 0) leftRows.push(left)
    if (right.length > 0) rightRows.push(right)
  }
  flush()

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

    const pages: PdfPage[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const [left = 0, , right = 0] = page.view
      const fragments: Fragment[] = []
      pages.push({ width: right - left, fragments })

      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue
        // transform is [a, b, c, d, e, f]: e and f are the position, and d is
        // the vertical scale, which is the rendered type size.
        const [, , , scale, x, y] = item.transform as number[]
        const size = Math.abs(scale ?? 10)
        fragments.push({
          text: item.str,
          x: (x ?? 0) - left,
          y: y ?? 0,
          size,
          // pdf.js measures the advance width for us. Estimating it from the
          // character count is what made letter-spaced text unreadable.
          width: item.width ?? item.str.length * size * 0.5,
        })
      }
    }

    if (pages.every((page) => page.fragments.length === 0)) {
      // A scan. There is no text to read, and guessing at one needs OCR.
      return { ok: false, reason: 'no-text' }
    }

    return { ok: true, lines: pages.flatMap((page) => pageToLines(page)), pages: document.numPages }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
