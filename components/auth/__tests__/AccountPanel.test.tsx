import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AccountPanel } from '@/components/auth/AccountPanel'
import { createEmptyDocument } from '@/lib/schema/defaults'
import { useDocuments } from '@/lib/store/documents'
import messages from '@/messages/no.json'

vi.mock('@/lib/hooks/use-hydrated', () => ({ useHydrated: () => true }))

const user = {
  id: 'user-a',
  email: 'ola@example.no',
  provider: 'google',
  createdAt: '2026-01-05T09:00:00.000Z',
  lastSignInAt: '2026-09-20T09:00:00.000Z',
}

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <AccountPanel user={user} />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  useDocuments.setState({
    documents: {},
    order: [],
    ownerId: 'user-a',
    tombstones: {},
    syncedDocuments: null,
    syncedOrder: null,
  })
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

describe('what the account page now answers', () => {
  it('says when the account was made and last used', () => {
    renderPanel()
    expect(screen.getByText('Opprettet')).toBeInTheDocument()
    expect(screen.getByText('Sist innlogget')).toBeInTheDocument()
  })

  it('states the rule that eventually deletes the account', () => {
    renderPanel()
    expect(screen.getByText(/24 måneder/)).toBeInTheDocument()
  })

  it('offers a password to somebody who signs in with Google', () => {
    // No password at all today: losing the Google account would lose this one.
    renderPanel()
    expect(screen.getByLabelText('Lag et passord')).toBeInTheDocument()
    expect(screen.getByText(/Med et passord kommer du inn/)).toBeInTheDocument()
  })

  it('offers a new address, and says the change waits for a confirmation', () => {
    renderPanel()
    expect(screen.getByLabelText('Bytt e-postadresse')).toBeInTheDocument()
    expect(screen.getByText(/bekreftelse til den nye adressen/)).toBeInTheDocument()
  })

  it('can end every other session', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Logg ut overalt' })).toBeInTheDocument()
  })

  it('clears the CVs without touching the account, and asks first', async () => {
    const document = createEmptyDocument({ name: 'Frontend' })
    useDocuments.setState({ documents: { [document.id]: document }, order: [document.id] })
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Slett alle CV-ene' }))
    expect(screen.getByText(/Slette 1 CV\?/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ja, slett alle' }))
    expect(useDocuments.getState().order).toEqual([])
    expect(useDocuments.getState().ownerId).toBe('user-a')
  })
})
