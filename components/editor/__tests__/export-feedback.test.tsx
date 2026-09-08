import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BETA_NOTICE_KEY, ExportButton } from '@/components/editor/ExportButton'
import { EXPORT_HINT_KEY } from '@/components/editor/ExportButton'
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

function memory(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

function setDesktop() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  // @ts-expect-error - restoring the absent happy-dom default
  delete window.matchMedia
})

async function exportOnce(storage = memory()) {
  setDesktop()
  const print = vi.fn(async (options: PrintCvNodeOptions) => void options)
  const node = window.document.createElement('div')
  node.className = 'cv-doc'

  wrap(
    <ExportButton document={fixture()} getNode={() => node} print={print} storage={storage} />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Last ned PDF' }))
  return { print, storage }
}

describe('beta notice after export', () => {
  it('appears only after the file, never before it', async () => {
    const { print } = await exportOnce()

    expect(print).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/gratis i beta/i)).toBeInTheDocument()
  })

  it('records that it has been shown', async () => {
    const { storage } = await exportOnce()
    expect(storage.map.get(BETA_NOTICE_KEY)).toBe('1')
  })

  it('does not appear again once seen', async () => {
    const { print } = await exportOnce(
      memory({ [BETA_NOTICE_KEY]: '1', [EXPORT_HINT_KEY]: '1' }),
    )
    expect(print).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('invites feedback without demanding it', async () => {
    await exportOnce()

    expect(screen.getByRole('button', { name: 'Ikke nå' })).toBeInTheDocument()
    // Sending is disabled until there is something to send.
    expect(screen.getByRole('button', { name: 'Send tilbakemelding' })).toBeDisabled()
  })

  it('says plainly when feedback has nowhere to go', async () => {
    await exportOnce()
    // No NEXT_PUBLIC_FEEDBACK_EMAIL in the test env, so it must not pretend.
    expect(screen.getByText('Tilbakemelding er ikke koblet til noe ennå.')).toBeInTheDocument()
  })

  it('closes on Ikke nå', async () => {
    await exportOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Ikke nå' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
