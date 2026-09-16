import type { PaperId } from '@/lib/schema/cv'
import { printStylesheet } from './stylesheets'

export type PrintCvNodeOptions = {
  /**
   * The live `.cv-doc` elements, in the order they should print. Copies of
   * them are what get printed. Usually one; two when a søknad goes first.
   */
  nodes: HTMLElement[]
  title: string
  paper: PaperId
  lang: string
}

/** Seams so the wrapper can be tested without a real print dialog. */
export type PrintDeps = {
  waitForFonts?: () => Promise<void>
  invokePrint?: (target: Window) => void
  cleanupDelayMs?: number
}

async function defaultWaitForFonts(): Promise<void> {
  try {
    await document.fonts?.ready
  } catch {
    // A font that fails to load must not block the export. The PDF will fall
    // back to the next family in the stack.
  }
}

function defaultInvokePrint(target: Window): void {
  target.print()
}

/**
 * Prints the CV by putting a copy of it in the page and hiding everything else.
 *
 * This used to clone the CV into a hidden iframe and print that. The isolation
 * was appealing - the app's own CSS could not reach the PDF - but Firefox
 * refused to print it: `print()` threw, and its preview came up empty. A frame
 * that renders nowhere on screen is not something every engine will put on
 * paper, and no amount of sizing or positioning made that dependable.
 *
 * Printing the page itself is the one path every browser supports. The
 * isolation turns out not to be needed either: the preview already renders
 * correctly inside the app document, using these same stylesheets, so a copy
 * of that node prints as what the preview shows. `@media print` in globals.css
 * hides every other child of `<body>`; the copy lives in `[data-print-root]`,
 * which is `display: none` on screen and visible only on paper.
 *
 * Two details that are easy to miss:
 *
 * - The document title becomes the suggested filename. It is restored
 *   afterwards, not before, or the dialog would offer the wrong name.
 * - The `@page` rule comes from a stylesheet linked for the duration, because
 *   page size depends on the document's paper and `@page` cannot be scoped.
 */
export async function printCvNode(
  { nodes, title, paper, lang }: PrintCvNodeOptions,
  deps: PrintDeps = {},
): Promise<void> {
  const waitForFonts = deps.waitForFonts ?? defaultWaitForFonts
  const invokePrint = deps.invokePrint ?? defaultInvokePrint
  const cleanupDelayMs = deps.cleanupDelayMs ?? 60_000

  const root = document.createElement('div')
  root.setAttribute('data-print-root', '')
  // Hidden from assistive technology and from tab order: it is a copy of
  // something already on the page.
  root.setAttribute('aria-hidden', 'true')

  for (const node of nodes) {
    const copy = node.cloneNode(true) as HTMLElement
    copy.setAttribute('lang', lang)
    root.append(copy)
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = printStylesheet(paper)

  const previousTitle = document.title

  document.body.append(root)
  document.head.append(link)
  document.title = title

  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    root.remove()
    link.remove()
    document.title = previousTitle
  }

  try {
    await waitForFonts()

    // `afterprint` is the only signal that the dialog is gone. Chrome blocks
    // inside print() and fires it on return; Firefox returns immediately and
    // fires it later. A flat timer would delete the document out from under
    // whichever of those is still showing it, so the timer is only a fallback
    // for an engine that never fires the event at all.
    window.addEventListener('afterprint', restore, { once: true })
    setTimeout(restore, cleanupDelayMs)

    invokePrint(window)
  } catch (error) {
    restore()
    throw error
  }
}
