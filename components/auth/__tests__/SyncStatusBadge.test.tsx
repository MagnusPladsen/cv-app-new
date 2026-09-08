import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it } from 'vitest'

import { SyncStatusBadge } from '@/components/auth/SyncStatusBadge'
import { useSyncStatus } from '@/lib/sync/status'
import messages from '@/messages/no.json'

function renderBadge() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <SyncStatusBadge />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => useSyncStatus.setState({ status: 'off', lastSyncedAt: null }))

describe('SyncStatusBadge', () => {
  it('says the CVs are local when nobody is signed in', () => {
    renderBadge()
    expect(screen.getByText(messages.auth.localOnly)).toBeInTheDocument()
  })

  it('confirms the CVs reached the account', () => {
    useSyncStatus.setState({ status: 'idle' })
    renderBadge()
    expect(screen.getByText(messages.auth.synced)).toBeInTheDocument()
  })

  it('reports a failure visibly rather than pretending to be saved', () => {
    useSyncStatus.setState({ status: 'error' })
    renderBadge()
    expect(screen.getByText(messages.auth.error)).toBeInTheDocument()
  })

  it('distinguishes offline from a real failure, since one needs no action', () => {
    useSyncStatus.setState({ status: 'offline' })
    renderBadge()
    expect(screen.getByText(messages.auth.offline)).toBeInTheDocument()
  })
})
