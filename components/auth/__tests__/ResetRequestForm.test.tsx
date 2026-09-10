import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ResetRequestForm } from '@/components/auth/ResetRequestForm'
import messages from '@/messages/no.json'

const resetPasswordForEmail = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({ auth: { resetPasswordForEmail } }),
}))

function renderForm() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <ResetRequestForm />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => resetPasswordForEmail.mockReset().mockResolvedValue({ error: null }))

describe('ResetRequestForm', () => {
  it('asks Supabase to send the link', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText(messages.auth.emailLabel), 'ola@example.no')
    await userEvent.click(screen.getByRole('button', { name: messages.auth.resetAction }))

    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'ola@example.no',
      expect.objectContaining({ redirectTo: expect.stringContaining('nytt-passord') }),
    )
  })

  it('confirms the same way whether or not the account exists', async () => {
    // Saying "no account for that address" would turn this form into a way to
    // find out who has signed up.
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } })
    renderForm()
    await userEvent.type(screen.getByLabelText(messages.auth.emailLabel), 'ukjent@example.no')
    await userEvent.click(screen.getByRole('button', { name: messages.auth.resetAction }))

    expect(await screen.findByText(/ukjent@example\.no/)).toBeInTheDocument()
    expect(screen.queryByText(/finnes ikke|not found/i)).toBeNull()
  })
})
