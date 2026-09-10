import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BETA_NOTICE_KEY,
  EXPORT_HINT_KEY,
  ExportButton,
  GUEST_EXPORT_KEY,
} from '@/components/editor/ExportButton'
import type { PrintCvNodeOptions } from '@/lib/print/print-cv'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

const configured = vi.hoisted(() => ({ value: true }))
const sessionUser = vi.hoisted(() => ({ value: null as { id: string; email: string } | null }))

vi.mock('@/lib/supabase/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/env')>()),
  // The prompt is gated on Supabase being configured, not on an OAuth
  // provider: email and password is a sign-in path with no provider behind it.
  isSupabaseConfigured: () => configured.value,
  enabledProviders: () => [],
}))

vi.mock('@/components/auth/SessionProvider', () => ({
  useSessionUser: () => sessionUser.value,
}))

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({ auth: { signInWithOAuth: vi.fn() } }),
}))

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

/** Desktop, with the mobile hint and beta notice out of the way. */
function setup(storage = memory({ [BETA_NOTICE_KEY]: '1', [EXPORT_HINT_KEY]: '1' })) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia

  const print = vi.fn(async (options: PrintCvNodeOptions) => void options)
  const node = window.document.createElement('div')
  node.className = 'cv-doc'

  wrap(<ExportButton document={fixture()} getNode={() => node} print={print} storage={storage} />)
  return { print, storage }
}

beforeEach(() => {
  configured.value = true
  sessionUser.value = null
})

afterEach(() => {
  // @ts-expect-error - restoring the absent happy-dom default
  delete window.matchMedia
})

const exportButton = () => screen.getByRole('button', { name: 'Last ned PDF' })

describe('guest mode at export', () => {
  it('offers signing in before a signed-out download', async () => {
    const { print } = setup()
    await userEvent.click(exportButton())

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(messages.editor.exportSignInTitle)).toBeInTheDocument()
    expect(print).not.toHaveBeenCalled()
  })

  it('says what continuing as a guest actually costs', () => {
    setup()
    void userEvent.click(exportButton())
    return screen.findByText(messages.editor.exportGuestWarning)
  })

  it('downloads when the user continues as a guest', async () => {
    const { print } = setup()
    await userEvent.click(exportButton())
    await userEvent.click(screen.getByRole('button', { name: messages.editor.exportGuest }))

    expect(print).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks once, then remembers the answer', async () => {
    const { print, storage } = setup()
    await userEvent.click(exportButton())
    await userEvent.click(screen.getByRole('button', { name: messages.editor.exportGuest }))
    expect(storage.map.get(GUEST_EXPORT_KEY)).toBe('1')

    await userEvent.click(exportButton())

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(print).toHaveBeenCalledTimes(2)
  })

  it('never asks a signed-in user to sign in', async () => {
    sessionUser.value = { id: 'user-a', email: 'ola@example.no' }
    const { print } = setup()

    await userEvent.click(exportButton())

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('never asks when Supabase is unconfigured, which would be a dead end', async () => {
    configured.value = false
    const { print } = setup()

    await userEvent.click(exportButton())

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('leaves the download available after dismissing the prompt', async () => {
    // Escaping the dialog must not strand the user: the button still works,
    // and it asks again because they did not answer.
    const { print } = setup()
    await userEvent.click(exportButton())
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(print).not.toHaveBeenCalled()

    await userEvent.click(exportButton())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
