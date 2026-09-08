import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it } from 'vitest'

import { ClaimNotice } from '@/components/auth/ClaimNotice'
import { useSyncStatus } from '@/lib/sync/status'
import messages from '@/messages/no.json'

function renderNotice() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <ClaimNotice />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => useSyncStatus.setState({ claimedCount: null }))

describe('ClaimNotice', () => {
  it('says nothing when nothing was claimed', () => {
    const { container } = renderNotice()
    expect(container).toBeEmptyDOMElement()
  })

  it('names how many CVs followed the user into their account', () => {
    useSyncStatus.setState({ claimedCount: 3 })
    renderNotice()
    expect(screen.getByText('3 CV-er ble lagret på kontoen din.')).toBeInTheDocument()
  })

  it('counts one CV in the singular', () => {
    useSyncStatus.setState({ claimedCount: 1 })
    renderNotice()
    expect(screen.getByText('1 CV ble lagret på kontoen din.')).toBeInTheDocument()
  })

  it('can be dismissed', async () => {
    useSyncStatus.setState({ claimedCount: 1 })
    renderNotice()
    await userEvent.click(screen.getByRole('button', { name: messages.beta.close }))
    expect(useSyncStatus.getState().claimedCount).toBeNull()
  })
})
