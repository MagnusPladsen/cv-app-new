import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountPanel } from '@/components/auth/AccountPanel'
import { useDocuments } from '@/lib/store/documents'
import messages from '@/messages/no.json'

vi.mock('@/lib/hooks/use-hydrated', () => ({ useHydrated: () => true }))

const user = { id: 'user-a', email: 'ola@example.no', provider: 'google' }

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <AccountPanel user={user} />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useDocuments.setState({ documents: {}, order: [], ownerId: 'user-a', tombstones: {} })
})

describe('AccountPanel', () => {
  it('names who is signed in and how', () => {
    renderPanel()
    expect(screen.getByText('Innlogget som ola@example.no')).toBeInTheDocument()
    expect(screen.getByText('via google')).toBeInTheDocument()
  })

  it('counts the CVs on the account', () => {
    useDocuments.getState().createDocument()
    useDocuments.getState().createDocument()
    renderPanel()
    expect(screen.getByText('2 CV-er på kontoen')).toBeInTheDocument()
  })

  it('does not offer a download when there is nothing to download', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: messages.auth.downloadAll })).toBeDisabled()
  })

  it('signs out and deletes through POST forms, never a link', () => {
    // A GET that signs you out or destroys your account can be fired by any
    // image tag on any page.
    renderPanel()
    const signOut = screen.getByRole('button', { name: messages.auth.signOut })
    expect(signOut.closest('form')).toHaveAttribute('method', 'post')
    expect(signOut.closest('form')).toHaveAttribute('action', '/auth/sign-out')
  })

  it('keeps account deletion disabled until the confirmation word is typed', async () => {
    renderPanel()
    const remove = screen.getByRole('button', { name: messages.auth.deleteAccount })
    expect(remove).toBeDisabled()

    await userEvent.type(screen.getByLabelText(messages.auth.deleteConfirm), 'slett')
    expect(remove).toBeDisabled()

    await userEvent.clear(screen.getByLabelText(messages.auth.deleteConfirm))
    await userEvent.type(screen.getByLabelText(messages.auth.deleteConfirm), 'SLETT')
    expect(remove).toBeEnabled()
  })

  it('warns what deletion costs before offering it', () => {
    renderPanel()
    expect(screen.getByText(messages.auth.deleteWarning)).toBeInTheDocument()
  })
})
