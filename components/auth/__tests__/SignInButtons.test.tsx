import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SignInButtons } from '@/components/auth/SignInButtons'
import messages from '@/messages/no.json'

const signInWithOAuth = vi.hoisted(() => vi.fn())
const providers = vi.hoisted(() => ({ value: ['google', 'apple'] as string[] }))

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({ auth: { signInWithOAuth } }),
}))

vi.mock('@/lib/supabase/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/env')>()),
  enabledProviders: () => providers.value,
}))

function renderButtons(next = '/no/cv') {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <SignInButtons next={next} />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => {
  signInWithOAuth.mockReset().mockResolvedValue({ error: null })
  providers.value = ['google', 'apple']
})

describe('SignInButtons', () => {
  it('renders one button per configured provider', () => {
    renderButtons()
    expect(screen.getByRole('button', { name: /Google/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Apple/ })).toBeInTheDocument()
  })

  it('shows only what is configured, so a disabled provider is never offered', () => {
    providers.value = ['google']
    renderButtons()
    expect(screen.queryByRole('button', { name: /Apple/ })).not.toBeInTheDocument()
  })

  it('explains itself rather than rendering nothing when auth is off', () => {
    providers.value = []
    renderButtons()
    expect(screen.getByText(messages.auth.unavailable)).toBeInTheDocument()
  })

  it('sends the user back where they started after the round trip', async () => {
    providers.value = ['google']
    renderButtons('/no/cv')

    await userEvent.click(screen.getByRole('button', { name: /Google/ }))

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback?next=%2Fno%2Fcv') },
    })
  })

  it('disables both buttons once one is clicked, so a double click cannot start two flows', async () => {
    renderButtons()

    await userEvent.click(screen.getByRole('button', { name: /Google/ }))

    expect(screen.getByRole('button', { name: /Apple/ })).toBeDisabled()
  })
})
