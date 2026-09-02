import type { PaperId } from '@/lib/schema/cv'
import { buildPrintHtml } from './build-print-html'

export type PrintCvNodeOptions = {
  /** The live `.cv-doc` element. Its outerHTML is what gets printed. */
  node: HTMLElement
  title: string
  paper: PaperId
  lang: string
  extraStylesheets?: readonly string[]
}

/** Seams so the wrapper can be tested without a real print dialog. */
export type PrintDeps = {
  waitForLoad?: (iframe: HTMLIFrameElement) => Promise<void>
  waitForFonts?: (iframe: HTMLIFrameElement) => Promise<void>
  invokePrint?: (iframe: HTMLIFrameElement) => void
  cleanupDelayMs?: number
}

function defaultWaitForLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (iframe.contentDocument?.readyState === 'complete') {
      resolve()
      return
    }
    iframe.addEventListener('load', () => resolve(), { once: true })
  })
}

async function defaultWaitForFonts(iframe: HTMLIFrameElement): Promise<void> {
  const fonts = iframe.contentDocument?.fonts
  if (!fonts) return
  try {
    await fonts.ready
  } catch {
    // A font that fails to load must not block the export. The PDF will
    // fall back to the next family in the stack.
  }
}

function defaultInvokePrint(iframe: HTMLIFrameElement): void {
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
}

/**
 * Prints the given CV node by cloning it into an isolated iframe that links the
 * same stylesheets as the preview. Isolation is the point: the app's Tailwind
 * reset, dark mode and layout chrome cannot reach the exported PDF.
 */
export async function printCvNode(
  { node, title, paper, lang, extraStylesheets }: PrintCvNodeOptions,
  deps: PrintDeps = {},
): Promise<void> {
  const waitForLoad = deps.waitForLoad ?? defaultWaitForLoad
  const waitForFonts = deps.waitForFonts ?? defaultWaitForFonts
  const invokePrint = deps.invokePrint ?? defaultInvokePrint
  const cleanupDelayMs = deps.cleanupDelayMs ?? 1000

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('tabindex', '-1')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0px'
  iframe.style.height = '0px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'

  iframe.srcdoc = buildPrintHtml({
    bodyHtml: node.outerHTML,
    title,
    paper,
    lang,
    extraStylesheets,
  })

  document.body.appendChild(iframe)

  const remove = () => {
    setTimeout(() => iframe.remove(), cleanupDelayMs)
  }

  try {
    await waitForLoad(iframe)
    await waitForFonts(iframe)
    invokePrint(iframe)
  } catch (error) {
    remove()
    throw error
  }

  remove()
}
