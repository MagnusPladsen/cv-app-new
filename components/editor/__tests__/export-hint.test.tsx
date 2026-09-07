import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EXPORT_HINT_KEY, ExportButton } from '@/components/editor/ExportButton'
import type { PrintCvNodeOptions } from '@/lib/print/print-cv'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(): CvDocumentData {
  let counter = 0
  return createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })
}

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function setViewport(isDesktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: isDesktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  // @ts-expect-error - restoring the absent happy-dom default
  delete window.matchMedia
})

function memory(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

function setup(isDesktop: boolean, storage = memory()) {
  setViewport(isDesktop)
  const print = vi.fn(async (options: PrintCvNodeOptions) => void options)
  const node = window.document.createElement('div')
  node.className = 'cv-doc'

  wrap(
    <ExportButton
      document={fixture()}
      getNode={() => node}
      print={print}
      storage={storage}
    />,
  )

  return { print, storage }
}

const exportButton = () => screen.getByRole('button', { name: 'Last ned PDF' })

describe('export hint', () => {
  it('exports straight away on desktop', async () => {
    const { print } = setup(true)
    await userEvent.click(exportButton())

    expect(print).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('explains the share sheet before a first mobile export', async () => {
    const { print } = setup(false)
    await userEvent.click(exportButton())

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Velg «Skriv ut» i menyen som åpnes.')).toBeInTheDocument()
    // Nothing is printed until the user acknowledges it.
    expect(print).not.toHaveBeenCalled()
  })

  it('exports once the hint is acknowledged', async () => {
    const { print, storage } = setup(false)
    await userEvent.click(exportButton())
    await userEvent.click(screen.getByRole('button', { name: 'Fortsett' }))

    expect(print).toHaveBeenCalledTimes(1)
    expect(storage.map.get(EXPORT_HINT_KEY)).toBe('1')
  })

  it('does not export when the hint is cancelled', async () => {
    const { print } = setup(false)
    await userEvent.click(exportButton())
    await userEvent.click(screen.getByRole('button', { name: 'Avbryt' }))

    expect(print).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the hint on Escape', async () => {
    setup(false)
    await userEvent.click(exportButton())
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('never shows the hint again once acknowledged', async () => {
    const { print } = setup(false, memory({ [EXPORT_HINT_KEY]: '1' }))
    await userEvent.click(exportButton())

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('shows the hint when storage cannot be read, rather than crashing', async () => {
    setViewport(false)
    const throwing = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    }
    const print = vi.fn(async (options: PrintCvNodeOptions) => void options)
    const node = window.document.createElement('div')

    wrap(
      <ExportButton
        document={fixture()}
        getNode={() => node}
        print={print}
        storage={throwing}
      />,
    )

    await userEvent.click(exportButton())
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // And acknowledging it still exports, even though the flag cannot persist.
    await userEvent.click(screen.getByRole('button', { name: 'Fortsett' }))
    expect(print).toHaveBeenCalledTimes(1)
  })
})
