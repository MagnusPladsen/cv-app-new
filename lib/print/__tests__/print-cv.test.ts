import { describe, expect, it, vi } from 'vitest'

import { printCvNode, type PrintDeps } from '@/lib/print/print-cv'

function makeNode(): HTMLElement {
  const node = document.createElement('div')
  node.className = 'cv-doc'
  node.textContent = 'hei'
  return node
}

function stubDeps(): PrintDeps {
  return {
    waitForFonts: vi.fn(async () => {}),
    invokePrint: vi.fn(() => {}),
    cleanupDelayMs: 0,
  }
}

const printRoot = () => document.querySelector('[data-print-root]')

describe('printCvNode', () => {
  it('puts a copy of the CV in the page, not the original', async () => {
    const deps = stubDeps()
    const node = makeNode()
    document.body.append(node)

    let copyAtPrint: HTMLElement | null = null
    deps.invokePrint = vi.fn(() => {
      copyAtPrint = printRoot()?.querySelector<HTMLElement>('.cv-doc') ?? null
    })

    await printCvNode({ nodes: [node], title: 'Ola_CV', paper: 'a4', lang: 'no' }, deps)

    // Read through a fresh binding: TypeScript narrows the captured variable
    // to null, because nothing it can see assigns to it.
    const copy = copyAtPrint as HTMLElement | null
    expect(copy).not.toBeNull()
    expect(copy).not.toBe(node)
    expect(copy?.textContent).toBe('hei')
    // The original is untouched and still where it was.
    expect(node.isConnected).toBe(true)
    node.remove()
  })

  it('makes the document title the suggested filename, and restores it after', async () => {
    const deps = stubDeps()
    document.title = 'CVApp'

    let titleAtPrint = ''
    deps.invokePrint = vi.fn(() => {
      titleAtPrint = document.title
    })

    await printCvNode({ nodes: [makeNode()], title: 'Ola_Nordmann_CV', paper: 'a4', lang: 'no' }, deps)

    // Restoring before the dialog closed would offer the wrong name.
    expect(titleAtPrint).toBe('Ola_Nordmann_CV')
    window.dispatchEvent(new Event('afterprint'))
    expect(document.title).toBe('CVApp')
  })

  it('links the page setup for the document’s paper', async () => {
    const deps = stubDeps()
    let href = ''
    deps.invokePrint = vi.fn(() => {
      href = document.querySelector('link[href^="/cv/print-"]')?.getAttribute('href') ?? ''
    })

    await printCvNode({ nodes: [makeNode()], title: 'x', paper: 'letter', lang: 'no' }, deps)
    expect(href).toBe('/cv/print-letter.css')
    window.dispatchEvent(new Event('afterprint'))
  })

  it('sets the language on the copy, so hyphenation is right', async () => {
    const deps = stubDeps()
    let lang = ''
    deps.invokePrint = vi.fn(() => {
      lang = printRoot()?.querySelector('.cv-doc')?.getAttribute('lang') ?? ''
    })

    await printCvNode({ nodes: [makeNode()], title: 'x', paper: 'a4', lang: 'en' }, deps)
    expect(lang).toBe('en')
    window.dispatchEvent(new Event('afterprint'))
  })

  it('waits for fonts before printing', async () => {
    const order: string[] = []
    const deps: PrintDeps = {
      waitForFonts: vi.fn(async () => void order.push('fonts')),
      invokePrint: vi.fn(() => void order.push('print')),
      cleanupDelayMs: 0,
    }

    await printCvNode({ nodes: [makeNode()], title: 'x', paper: 'a4', lang: 'no' }, deps)
    expect(order).toEqual(['fonts', 'print'])
    window.dispatchEvent(new Event('afterprint'))
  })

  it('clears up on afterprint rather than on a timer', async () => {
    // The blank-PDF bug in the iframe version: print() blocks in Chrome and
    // returns immediately in Firefox, so a short timer deleted the document
    // while the preview was still showing it.
    const deps = stubDeps()
    deps.cleanupDelayMs = 60_000

    await printCvNode({ nodes: [makeNode()], title: 'x', paper: 'a4', lang: 'no' }, deps)
    expect(printRoot()).not.toBeNull()

    window.dispatchEvent(new Event('afterprint'))
    expect(printRoot()).toBeNull()
    expect(document.querySelector('link[href^="/cv/print-"]')).toBeNull()
  })

  it('clears up even when printing throws', async () => {
    const deps = stubDeps()
    deps.invokePrint = vi.fn(() => {
      throw new Error('user cancelled')
    })

    await expect(
      printCvNode({ nodes: [makeNode()], title: 'x', paper: 'a4', lang: 'no' }, deps),
    ).rejects.toThrow('user cancelled')

    expect(printRoot()).toBeNull()
    expect(document.querySelector('link[href^="/cv/print-"]')).toBeNull()
  })
})
