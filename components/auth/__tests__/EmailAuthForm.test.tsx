import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import messages from '@/messages/no.json'

const signInWithPassword = vi.hoisted(() => vi.fn())
const signUp = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({ auth: { signInWithPassword, signUp } }),
}))

function renderForm() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <EmailAuthForm next="/no/cv" />
    </NextIntlClientProvider>,
  )
}

async function fill(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(messages.auth.emailLabel), email)
  await userEvent.type(screen.getByLabelText(messages.auth.passwordLabel), password)
}

beforeEach(() => {
  signInWithPassword.mockReset().mockResolvedValue({ error: null })
  signUp.mockReset().mockResolvedValue({ error: null })
})

describe('EmailAuthForm', () => {
  it('signs in with the address and password given', async () => {
    renderForm()
    await fill('ola@example.no', 'hemmelig123')
    await userEvent.click(screen.getByRole('button', { name: messages.auth.signInAction }))

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'ola@example.no',
      password: 'hemmelig123',
    })
  })

  it('translates the failure instead of showing Supabase prose', async () => {
    // "Invalid login credentials" is written for developers and is not
    // translated. A jobseeker should read that the password is wrong.
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    renderForm()
    await fill('ola@example.no', 'feil')
    await userEvent.click(screen.getByRole('button', { name: messages.auth.signInAction }))

    expect(await screen.findByText(messages.auth.errorInvalid)).toBeInTheDocument()
  })

  it('refuses a short password before asking the server', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: messages.auth.toSignUp }))
    await fill('ola@example.no', 'kort')
    await userEvent.click(screen.getByRole('button', { name: messages.auth.signUpAction }))

    expect(screen.getByText(messages.auth.errorWeak)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('tells the user to check their inbox rather than pretending to sign them in', async () => {
    // The project requires a confirmed address, so sign-up creates no session.
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: messages.auth.toSignUp }))
    await fill('ny@example.no', 'passordet123')
    await userEvent.click(screen.getByRole('button', { name: messages.auth.signUpAction }))

    expect(await screen.findByText(messages.auth.checkInbox)).toBeInTheDocument()
    expect(screen.getByText(/ny@example\.no/)).toBeInTheDocument()
  })

  it('sends the user back where they started after confirming', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: messages.auth.toSignUp }))
    await fill('ny@example.no', 'passordet123')
    await userEvent.click(screen.getByRole('button', { name: messages.auth.signUpAction }))

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: expect.stringContaining('/auth/callback?next=%2Fno%2Fcv') },
      }),
    )
  })

  it('switches between signing in and signing up without losing the page', async () => {
    renderForm()
    expect(screen.getByRole('button', { name: messages.auth.signInAction })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: messages.auth.toSignUp }))
    expect(screen.getByRole('button', { name: messages.auth.signUpAction })).toBeInTheDocument()
    expect(screen.getByText(messages.auth.passwordHint)).toBeInTheDocument()
  })

  it('asks a password manager for the right kind of password', async () => {
    renderForm()
    expect(screen.getByLabelText(messages.auth.passwordLabel)).toHaveAttribute(
      'autocomplete',
      'current-password',
    )

    await userEvent.click(screen.getByRole('button', { name: messages.auth.toSignUp }))
    expect(screen.getByLabelText(messages.auth.passwordLabel)).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
  })
})
