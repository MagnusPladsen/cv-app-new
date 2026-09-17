import { unzipSync } from 'fflate'

import type { Line } from './parse-cv'

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
function readParagraph(paragraph: Element, styles: Styles, nested: Element[]): Line[] {
  const properties = child(paragraph, 'pPr')
  const styleId = attribute(properties && child(properties, 'pStyle'), 'val')
  const paragraphSize = (styleId && styles.sizes.get(styleId)) || styles.defaultSize
  // A list item's bullet is numbering, not text, so it is put back: the
  // parser tells description from title by it.
  const listed = properties ? child(properties, 'numPr') !== undefined : false

  const lines: { text: string; size: number }[] = [{ text: '', size: 0 }]

  const visit = (node: Node, runSize: number) => {
    for (const current of node.childNodes) {
      if (current.nodeType !== 1) continue
      const element = current as Element

      // Word writes a drawing twice: a modern version and a VML fallback for
      // old readers. Reading both doubles every text box.
      if (element.namespaceURI === MC && element.localName === 'Fallback') continue

      if (isW(element, 'txbxContent')) {
        nested.push(element)
        continue
      }
      if (isW(element, 'p')) {
        nested.push(element)
        continue
      }

      if (isW(element, 'r')) {
        const runProperties = child(element, 'rPr')
        const runStyle = attribute(runProperties && child(runProperties, 'rStyle'), 'val')
        const size =
          sizeOf(runProperties) ?? (runStyle ? styles.sizes.get(runStyle) : undefined) ?? paragraphSize
        visit(element, size)
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
        visit(element, runSize)
      }
    }
  }

  visit(paragraph, paragraphSize)

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
    return [{ text: listed || typed ? `• ${text}` : text, size: line.size || paragraphSize }]
  })
}

/** Every paragraph under `root`, in document order, tables included. */
function readBody(root: Element, styles: Styles): Line[] {
  const lines: Line[] = []

  const walk = (node: Element) => {
    for (const current of node.childNodes) {
      if (current.nodeType !== 1) continue
      const element = current as Element
      if (element.namespaceURI === MC && element.localName === 'Fallback') continue

      if (isW(element, 'tr')) {
        readRow(element)
        continue
      }

      if (isW(element, 'p')) {
        const nested: Element[] = []
        lines.push(...readParagraph(element, styles, nested))
        for (const inner of nested) {
          if (isW(inner, 'p')) lines.push(...readParagraph(inner, styles, nested))
          else walk(inner)
        }
        continue
      }
      walk(element)
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

    return unique.length > 0 ? { ok: true, lines: unique } : { ok: false, reason: 'no-text' }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
