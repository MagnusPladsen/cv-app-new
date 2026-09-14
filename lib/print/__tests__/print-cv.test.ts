import { describe, expect, it, vi } from 'vitest'
import { printCvNode } from '@/lib/print/print-cv'

function makeNode(): HTMLElement {
  const node = document.createElement('div')
  node.className = 'cv-doc'
  node.textContent = 'hei'
  return node
}

function stubDeps() {
  return {
    waitForLoad: vi.fn(async (iframe: HTMLIFrameElement) => void iframe),
    waitForFonts: vi.fn(async (iframe: HTMLIFrameElement) => void iframe),
    invokePrint: vi.fn((iframe: HTMLIFrameElement) => void iframe),
    cleanupDelayMs: 0,
  }
}

describe('printCvNode', () => {
  it('appends an iframe carrying the cloned markup', async () => {
    const deps = stubDeps()
    let capturedSrcdoc = ''
    deps.waitForLoad = vi.fn(async (iframe: HTMLIFrameElement) => {
      capturedSrcdoc = iframe.srcdoc
    })

    await printCvNode({ node: makeNode(), title: 'Ola_CV', paper: 'a4', lang: 'no' }, deps)

    expect(capturedSrcdoc).toContain('class="cv-doc"')
    expect(capturedSrcdoc).toContain('href="/cv/print-a4.css"')
    expect(capturedSrcdoc).toContain('<title>Ola_CV</title>')
  })

  it('waits for load and fonts before printing', async () => {
    const deps = stubDeps()
    await printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps)

    expect(deps.waitForLoad).toHaveBeenCalledTimes(1)
    expect(deps.waitForFonts).toHaveBeenCalledTimes(1)
    expect(deps.invokePrint).toHaveBeenCalledTimes(1)
    expect(deps.waitForFonts.mock.invocationCallOrder[0]!).toBeLessThan(
      deps.invokePrint.mock.invocationCallOrder[0]!,
    )
  })

  it('removes the iframe once printing is done', async () => {
    const deps = stubDeps()
    await printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })

  it('removes the iframe even when printing throws', async () => {
    const deps = stubDeps()
    deps.invokePrint = vi.fn(() => {
      throw new Error('user cancelled')
    })

    await expect(
      printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps),
    ).rejects.toThrow('user cancelled')

    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })

  it('keeps the iframe off screen at full page size, not zero-sized', async () => {
    const deps = stubDeps()
    let captured: HTMLIFrameElement | undefined
    deps.waitForLoad = vi.fn(async (iframe: HTMLIFrameElement) => {
      captured = iframe
    })

    await printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps)

    // A 0x0, opacity:0 frame lays out fine but a browser may skip painting
    // it, and then printing it yields blank paper. Off-screen at real size
    // is visible to the renderer and invisible to the reader.
    expect(captured?.style.position).toBe('fixed')
    expect(captured?.style.width).toBe('210mm')
    expect(captured?.style.height).toBe('297mm')
    expect(captured?.style.left).toBe('-10000px')
    expect(captured?.style.opacity).toBe('')
    expect(captured?.getAttribute('aria-hidden')).toBe('true')
  })
})
