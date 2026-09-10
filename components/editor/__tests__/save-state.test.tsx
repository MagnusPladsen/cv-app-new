import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SaveState } from '@/components/editor/SaveState'
import { useDocuments } from '@/lib/store/documents'
import messages from '@/messages/no.json'

const configured = vi.hoisted(() => ({ value: true }))
const sessionUser = vi.hoisted(() => ({ value: null as { id: string; email: string } | null }))

vi.mock('@/lib/supabase/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/env')>()),
  isSupabaseConfigured: () => configured.value,
}))

vi.mock('@/components/auth/SessionProvider', () => ({
  useSessionUser: () => sessionUser.value,
}))

function renderState(id = 'doc-1') {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <SaveState documentId={id} />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  configured.value = true
  sessionUser.value = null
  useDocuments.setState({ documents: {}, order: [], ownerId: null, tombstones: {} })
})

describe('SaveState', () => {
  it('offers a way to save when signed out', () => {
    renderState()
    expect(screen.getByRole('link', { name: messages.auth.saveSignedOut })).toBeInTheDocument()
  })

  it('returns to this CV after signing in, not to the dashboard', () => {
    renderState('abc123')
    expect(screen.getByRole('link', { name: messages.auth.saveSignedOut })).toHaveAttribute(
      'href',
      expect.stringContaining('next=%2Fno%2Fcv%2Fabc123'),
    )
  })

  it('shows the sync state instead once signed in', () => {
    sessionUser.value = { id: 'user-a', email: 'ola@example.no' }
    renderState()
    expect(screen.queryByRole('link', { name: messages.auth.saveSignedOut })).toBeNull()
  })

  it('offers no sign-in when there is no backend to sign in to', () => {
    configured.value = false
    renderState()
    expect(screen.queryByRole('link', { name: messages.auth.saveSignedOut })).toBeNull()
  })
})

describe('signing in keeps the work', () => {
  it('claims a CV made while signed out', () => {
    // The promise the button makes. If this ever fails, someone loses the CV
    // they were told signing in would save.
    const id = useDocuments.getState().createDocument({ name: 'Min CV' })
    useDocuments.getState().renameDocument(id, 'Sykepleier 2026')

    expect(useDocuments.getState().adoptOwner('user-a')).toBe('claimed')

    const kept = useDocuments.getState().documents[id]
    expect(kept, 'the CV was dropped on sign-in').toBeDefined()
    expect(kept?.name).toBe('Sykepleier 2026')
    expect(useDocuments.getState().ownerId).toBe('user-a')
  })

  it('keeps every CV, not just the open one', () => {
    const first = useDocuments.getState().createDocument({ name: 'A' })
    const second = useDocuments.getState().createDocument({ name: 'B' })

    useDocuments.getState().adoptOwner('user-a')

    expect(Object.keys(useDocuments.getState().documents).sort()).toEqual([first, second].sort())
  })

  it('does not hand one person another person CVs on a shared browser', () => {
    // The other half: work made under one account must not follow a second
    // account signing in on the same machine.
    useDocuments.getState().createDocument({ name: 'Theirs' })
    useDocuments.getState().adoptOwner('user-a')

    expect(useDocuments.getState().adoptOwner('user-b')).toBe('switched')
    expect(useDocuments.getState().documents).toEqual({})
  })
})
