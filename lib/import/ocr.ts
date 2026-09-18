import type { Line } from './parse-cv'
import { pageToLines, type Fragment } from './pdf-lines'

/**
 * Reading a CV that is a photograph of a CV.
 *
 * Plenty of people only have their CV as a scan, and a scan holds no text at
 * all - `pdfToLines` returns `no-text` and there is nothing to import. This
 * runs Tesseract over a rendering of each page instead.
 *
 * It is never started on its own. Recognition takes tens of seconds, warms a
 * laptop up, and downloads about 7 MB of engine and language data, so it
 * happens only when somebody, having been told all three, asks for it.
 *
 * The engine and the models are served from our own origin (see
 * scripts/fetch-ocr-assets.mjs). Nothing about the file leaves the machine,
 * which is the promise the whole import makes.
 */

export type OcrExtraction = { ok: true; lines: Line[] } | { ok: false; reason: 'unreadable' }

/** Beyond this a CV is a book, and the wait stops being worth it. */
const MAX_PAGES = 3

/** Rendering scale. 2 is about 144 dpi, where Tesseract stops improving. */
const SCALE = 2

export type OcrProgress = {
  /** 0 to 1 over the whole job, pages included. */
  ratio: number
  page: number
  pages: number
}

type Word = {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

/**
 * One recognised word becomes one fragment, in the coordinates a PDF uses:
 * x from the left, y upwards, and a type size taken from the word's height.
 * That way OCR output goes through exactly the same line, column and heading
 * logic as text read from a PDF - including two-column pages, which a scanned
 * CV is as likely to be as any other.
 */
export function toFragments(words: Word[], height: number): Fragment[] {
  return words
    .filter((word) => word.text.trim())
    .map((word) => ({
      text: word.text,
      x: word.bbox.x0 / SCALE,
      y: (height - word.bbox.y1) / SCALE,
      // Cap height rather than the box: a word with a descender is not set
      // larger than its neighbours.
      size: Math.max(6, (word.bbox.y1 - word.bbox.y0) / SCALE),
      width: (word.bbox.x1 - word.bbox.x0) / SCALE,
    }))
}

export async function ocrPdf(
  file: ArrayBuffer,
  onProgress: (progress: OcrProgress) => void = () => {},
): Promise<OcrExtraction> {
  try {
    const [pdfjs, { createWorker }] = await Promise.all([
      import('pdfjs-dist'),
      import('tesseract.js'),
    ])

    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()

    const document = await pdfjs.getDocument({ data: new Uint8Array(file) }).promise
    const pages = Math.min(document.numPages, MAX_PAGES)

    // Both languages, because a Norwegian CV routinely has English in it and
    // Tesseract reads a mixture better than it reads the wrong one.
    const worker = await createWorker('nor+eng', 1, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr',
      langPath: '/ocr',
      // Our CSP has no blob: in script-src, and does not need one: the
      // worker is served from this origin like any other file.
      workerBlobURL: false,
      logger: (message: { status: string; progress: number }) => {
        if (message.status !== 'recognizing text') return
        onProgress({ ratio: message.progress, page: 1, pages })
      },
    })

    try {
      const lines: Line[] = []

      for (let number = 1; number <= pages; number += 1) {
        const page = await document.getPage(number)
        const viewport = page.getViewport({ scale: SCALE })

        const canvas = globalThis.document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const context = canvas.getContext('2d')
        if (!context) return { ok: false, reason: 'unreadable' }
        await page.render({ canvas, canvasContext: context, viewport }).promise

        const done = (number - 1) / pages
        onProgress({ ratio: done, page: number, pages })
        const { data } = await worker.recognize(canvas, {}, { blocks: true })
        onProgress({ ratio: number / pages, page: number, pages })

        const words: Word[] = (data.blocks ?? []).flatMap((block) =>
          (block.paragraphs ?? []).flatMap((paragraph) =>
            (paragraph.lines ?? []).flatMap((line) => line.words ?? []),
          ),
        )

        lines.push(
          ...pageToLines({
            width: viewport.width / SCALE,
            fragments: toFragments(words, canvas.height),
          }),
        )

        // Rendering a page keeps its bitmap alive for as long as the page
        // object does, and three A4 pages at this scale is a lot of memory.
        canvas.width = 0
        canvas.height = 0
        page.cleanup()
      }

      return lines.length > 0 ? { ok: true, lines } : { ok: false, reason: 'unreadable' }
    } finally {
      await worker.terminate()
    }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
