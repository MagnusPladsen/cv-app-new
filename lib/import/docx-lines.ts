import { unzipSync } from 'fflate'

import type { Line } from './parse-cv'
import { pageToLines, type Fragment } from './pdf-lines'

/**
 * Reading a Word document into the same lines a PDF produces.
 *
 * A .docx is a zip of XML. The text is in `word/document.xml`, one `w:p` per
 * paragraph, and unlike a PDF it is already in reading order - so none of the
 * baseline and column reconstruction that PDFs need applies here. A table
 * holding a two-column layout reads cell by cell, which is left column then
 * right column for each row.
 *
 * Like the PDF path, this runs in the browser and the file goes nowhere.
 */

export type DocxExtraction =
  | { ok: true; lines: Line[] }
  | { ok: false; reason: 'no-text' | 'unreadable' }

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'

/** Drawing coordinates are in English Metric Units: 12,700 to the point. */
const EMU_PER_POINT = 12_700

/** A text box placed at a position on the page, in points. */
type Box = { id: number; x: number; y: number; width: number }

type BoxedLine = Line & { box?: Box }

/** The line without its box, once the box has been used for ordering. */
const unboxed = (line: BoxedLine): Line => {
  const plain: BoxedLine = { ...line }
  delete plain.box
  return plain
}

/** Something found inside a paragraph that is read after it. */
type Nested = { element: Element; box?: Box }

/** Word's own default when a document sets none: 10pt. */
const WORD_DEFAULT_SIZE = 10

type Styles = {
  defaultSize: number
  /** Font size per style id, in points, with `basedOn` already followed. */
  sizes: Map<string, number>
}

const isW = (node: Node, name: string): boolean =>
  node.nodeType === 1 && (node as Element).namespaceURI === W && (node as Element).localName === name

const children = (node: Node, name: string): Element[] =>
  [...node.childNodes].filter((child): child is Element => isW(child, name))

const child = (node: Node, name: string): Element | undefined => children(node, name)[0]

/**
 * Every `w:` element of a name, in document order. Walked by hand rather than
 * with getElementsByTagNameNS, which is not implemented everywhere this runs.
 */
function descendants(root: Node, name: string): Element[] {
  const found: Element[] = []
  const walk = (node: Node) => {
    for (const current of node.childNodes) {
      if (current.nodeType !== 1) continue
      if (isW(current, name)) found.push(current as Element)
      walk(current)
    }
  }
  walk(root)
  return found
}

const attribute = (element: Element | undefined, name: string): string | null =>
  element?.getAttributeNS(W, name) ?? element?.getAttribute(`w:${name}`) ?? null

/** `w:sz` is in half-points. */
function sizeOf(properties: Element | undefined): number | undefined {
  const value = Number(attribute(properties && child(properties, 'sz'), 'val'))
  return Number.isFinite(value) && value > 0 ? value / 2 : undefined
}

function readStyles(xml: Document | null): Styles {
  const styles: Styles = { defaultSize: WORD_DEFAULT_SIZE, sizes: new Map() }
  if (!xml) return styles

  const defaults = descendants(xml, 'rPrDefault')[0]
  const defaultSize = sizeOf(defaults ? child(defaults, 'rPr') : undefined)
  if (defaultSize) styles.defaultSize = defaultSize

  const own = new Map<string, { size?: number; basedOn?: string }>()
  for (const style of descendants(xml, 'style')) {
    const id = attribute(style, 'styleId')
    if (!id) continue
    own.set(id, {
      size: sizeOf(child(style, 'rPr')),
      basedOn: attribute(child(style, 'basedOn'), 'val') ?? undefined,
    })
  }

  const resolve = (id: string, depth = 0): number | undefined => {
    const style = own.get(id)
    if (!style || depth > 10) return undefined
    return style.size ?? (style.basedOn ? resolve(style.basedOn, depth + 1) : undefined)
  }
  for (const id of own.keys()) {
    const size = resolve(id)
    if (size) styles.sizes.set(id, size)
  }

  return styles
}

/**
 * The lines of one paragraph. Usually one; a manual line break makes more.
 *
 * Text boxes are paragraphs nested inside a run. They are collected separately
 * and read after the paragraph that anchors them, rather than spliced into the
 * middle of its sentence.
 */
let boxCount = 0

const inWp = (node: Node | undefined, name: string): Element | undefined =>
  node
    ? ([...node.childNodes].find(
        (child) =>
          child.nodeType === 1 &&
          (child as Element).namespaceURI === WP &&
          (child as Element).localName === name,
      ) as Element | undefined)
    : undefined

/** Where a floating drawing sits. An alignment instead of an offset is 0. */
function readAnchor(anchor: Element): Box {
  const offset = (axis: string) =>
    Number(inWp(inWp(anchor, axis), 'posOffset')?.textContent ?? 0) / EMU_PER_POINT || 0
  const extent = inWp(anchor, 'extent')
  boxCount += 1
  return {
    id: boxCount,
    x: offset('positionH'),
    y: offset('positionV'),
    width: Number(extent?.getAttribute('cx') ?? 0) / EMU_PER_POINT || 0,
  }
}

function readParagraph(
  paragraph: Element,
  styles: Styles,
  nested: Nested[],
  box?: Box,
): BoxedLine[] {
  const properties = child(paragraph, 'pPr')
  const styleId = attribute(properties && child(properties, 'pStyle'), 'val')
  const paragraphSize = (styleId && styles.sizes.get(styleId)) || styles.defaultSize
  // A list item's bullet is numbering, not text, so it is put back: the
  // parser tells description from title by it.
  const listed = properties ? child(properties, 'numPr') !== undefined : false

  const lines: { text: string; size: number }[] = [{ text: '', size: 0 }]

  const visit = (node: Node, runSize: number, within: Box | undefined) => {
    for (const current of node.childNodes) {
      if (current.nodeType !== 1) continue
      const element = current as Element

      // Word writes a drawing twice: a modern version and a VML fallback for
      // old readers. Reading both doubles every text box.
      if (element.namespaceURI === MC && element.localName === 'Fallback') continue

      // A floating drawing: its text boxes are placed on the page by position,
      // not by where they sit in the document.
      if (element.namespaceURI === WP && element.localName === 'anchor') {
        visit(element, runSize, readAnchor(element))
        continue
      }

      if (isW(element, 'txbxContent') || isW(element, 'p')) {
        nested.push({ element, box: within })
        continue
      }

      if (isW(element, 'r')) {
        const runProperties = child(element, 'rPr')
        const runStyle = attribute(runProperties && child(runProperties, 'rStyle'), 'val')
        const size =
          sizeOf(runProperties) ?? (runStyle ? styles.sizes.get(runStyle) : undefined) ?? paragraphSize
        visit(element, size, within)
        continue
      }

      const line = lines[lines.length - 1]!
      if (isW(element, 't')) {
        line.text += element.textContent ?? ''
        if ((element.textContent ?? '').trim()) line.size = Math.max(line.size, runSize)
      } else if (isW(element, 'tab')) {
        // A tab lines text up in columns - "Utvikler<tab>2019 – 2023" - so it
        // separates things rather than words.
        line.text += ' · '
      } else if (isW(element, 'br') || isW(element, 'cr')) {
        lines.push({ text: '', size: 0 })
      } else if (!isW(element, 'delText') && !isW(element, 'instrText')) {
        visit(element, runSize, within)
      }
    }
  }

  visit(paragraph, paragraphSize, box)

  return lines.flatMap((line) => {
    let text = line.text
      .replace(/\s+/g, ' ')
      .replace(/^(?:\s*·\s*)+|(?:\s*·\s*)+$/g, '')
      .replace(/(?:\s*·\s*){2,}/g, ' · ')
      .trim()
    // Some producers type the bullet and tab it out instead of numbering it.
    const typed = /^[•▪◦‣](?:\s*·)?\s*/.exec(text)
    if (typed) text = text.slice(typed[0].length)
    if (!text) return []
    const read: BoxedLine = { text: listed || typed ? `• ${text}` : text, size: line.size || paragraphSize }
    if (box) read.box = box
    return [read]
  })
}

/** Every paragraph under `root`, in document order, tables included. */
function readBody(root: Element, styles: Styles): BoxedLine[] {
  const lines: BoxedLine[] = []

  const walk = (node: Element, box?: Box) => {
    for (const current of node.childNodes) {
      if (current.nodeType !== 1) continue
      const element = current as Element
      if (element.namespaceURI === MC && element.localName === 'Fallback') continue

      if (isW(element, 'tr')) {
        readRow(element)
        continue
      }

      if (isW(element, 'p')) {
        const nested: Nested[] = []
        lines.push(...readParagraph(element, styles, nested, box))
        for (const inner of nested) {
          const within = inner.box ?? box
          if (isW(inner.element, 'p')) {
            lines.push(...readParagraph(inner.element, styles, nested, within))
          } else {
            walk(inner.element, within)
          }
        }
        continue
      }
      walk(element, box)
    }
  }

  /**
   * A table row whose cells each hold one line is one line: "Utvikler, Acme"
   * beside "2019 – 2023" is a job with its dates. A row with more in it is a
   * layout, and its cells are read one after the other.
   */
  const readRow = (row: Element) => {
    const start = lines.length
    const counts: number[] = []
    for (const cell of children(row, 'tc')) {
      const before = lines.length
      walk(cell)
      counts.push(lines.length - before)
    }
    const cells = lines.slice(start)
    if (cells.length > 1 && counts.every((count) => count <= 1)) {
      lines.splice(start, cells.length, {
        text: cells.map((line) => line.text).join(' · '),
        size: Math.max(...cells.map((line) => line.size ?? 0)),
      })
    }
  }

  walk(root)
  return lines
}

function parseXml(bytes: Uint8Array | undefined): Document | null {
  if (!bytes) return null
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml')
  return xml.getElementsByTagName('parsererror').length > 0 ? null : xml
}

/**
 * Puts a page built from floating text boxes back into reading order.
 *
 * Some Word templates are nothing but text boxes placed on the page, and the
 * document stores them in whatever order they were drawn: the name last, a
 * job's dates before its title. Their positions are all that says how the
 * page reads, which makes it the same problem as a PDF - so each box becomes
 * one positioned fragment and the PDF reader's row and column logic orders
 * them. Each fragment stands for its whole box, so a box's paragraphs stay
 * together however tall it really is.
 */
function layOutBoxes(lines: BoxedLine[]): Line[] {
  const flowing = lines.filter((line) => !line.box).map(unboxed)

  const boxes = new Map<number, { box: Box; lines: Line[] }>()
  for (const line of lines) {
    const box = line.box
    if (!box) continue
    const entry = boxes.get(box.id) ?? { box, lines: [] }
    entry.lines.push(unboxed(line))
    boxes.set(box.id, entry)
  }
  const placed = [...boxes.values()]
  const left = Math.min(...placed.map(({ box }) => box.x))
  const right = Math.max(...placed.map(({ box }) => box.x + box.width))

  const fragments: Fragment[] = placed.map(({ box, lines: boxLines }, index) => ({
    text: `\u0000${index}\u0000`,
    x: box.x - left,
    // Drawing offsets grow downwards, PDF coordinates upwards.
    y: -box.y,
    size: Math.max(...boxLines.map((line) => line.size ?? 0)),
    width: box.width,
  }))

  const ordered = pageToLines({ width: right - left, fragments }, { blocks: true }).flatMap((line) => {
    const inRow = [...line.text.matchAll(/\u0000(\d+)\u0000/g)].map(
      (match) => placed[Number(match[1])]!.lines,
    )
    // Boxes side by side holding a line each - a title and its dates - are
    // one line, as a table row would be.
    const expanded: Line[] =
      inRow.length > 1 && inRow.every((boxLines) => boxLines.length === 1)
        ? [
            {
              text: inRow.map((boxLines) => boxLines[0]!.text).join(' · '),
              size: Math.max(...inRow.map((boxLines) => boxLines[0]!.size ?? 0)),
            },
          ]
        : inRow.flat()
    if (line.columnStart && expanded[0]) expanded[0] = { ...expanded[0], columnStart: true }
    return expanded
  })

  return [...flowing, ...ordered]
}

/** Whether these bytes are a zip archive, which a .docx always is. */
export const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b

export function docxToLines(file: ArrayBuffer): DocxExtraction {
  const bytes = new Uint8Array(file)
  if (!isZip(bytes)) return { ok: false, reason: 'unreadable' }

  try {
    const entries = unzipSync(bytes, {
      filter: (entry) =>
        entry.name === 'word/document.xml' ||
        entry.name === 'word/styles.xml' ||
        /^word\/header\d*\.xml$/.test(entry.name),
    })

    const document = parseXml(entries['word/document.xml'])
    if (!document) return { ok: false, reason: 'unreadable' }
    const styles = readStyles(parseXml(entries['word/styles.xml']))

    // Templates often put the name and contact details in the page header,
    // where they repeat on every page. Read once, before the body.
    const headers = Object.keys(entries)
      .filter((name) => name.startsWith('word/header'))
      .sort()
      .flatMap((name) => {
        const header = parseXml(entries[name])
        return header ? readBody(header.documentElement, styles) : []
      })

    const body = descendants(document, 'body')[0]
    const lines = [...headers, ...(body ? readBody(body, styles) : [])]

    // A header shared by a first-page and a default variant says the same
    // thing twice.
    const seen = new Set<string>()
    const unique = lines.filter((line, index) => {
      if (index >= headers.length) return true
      if (seen.has(line.text)) return false
      seen.add(line.text)
      return true
    })

    if (unique.length === 0) return { ok: false, reason: 'no-text' }

    // Laid out by position only when the boxes are the document. A normal
    // CV with a text box or two keeps its reading order, with each box read
    // where it is anchored.
    const boxed = unique.filter((line) => line.box)
    const boxCount = new Set(boxed.map((line) => line.box!.id)).size
    if (boxCount >= 3 && boxed.length * 2 >= unique.length) {
      return { ok: true, lines: layOutBoxes(unique) }
    }
    return { ok: true, lines: unique.map(unboxed) }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
