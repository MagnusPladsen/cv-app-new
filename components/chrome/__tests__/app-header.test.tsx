import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { AppHeader } from '@/components/chrome/AppHeader'
import messages from '@/messages/no.json'

vi.mock('@/i18n/navigation', async () => {
  const { createElement } = await import('react')
  return {
    usePathname: () => '/cv',
    Link: ({
      href,
      locale,
      children,
      ...rest
    }: {
      href: string
      locale?: string
      children: React.ReactNode
    }) =>
      createElement('a', { href: locale ? `/${locale}${href}` : href, ...rest }, children),
  }
})

function wrap() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <AppHeader />
    </NextIntlClientProvider>,
  )
}

describe('AppHeader', () => {
  it('renders the wordmark linking home', () => {
    wrap()
    expect(screen.getByRole('link', { name: 'CVApp' })).toHaveAttribute('href', '/')
  })

  it('links to the gallery and the dashboard', () => {
    wrap()
    expect(screen.getByRole('link', { name: 'Maler' })).toHaveAttribute('href', '/templates')
    expect(screen.getByRole('link', { name: 'Mine CV-er' })).toHaveAttribute('href', '/cv')
  })

  it('offers both locales on the current path, so switching keeps your place', () => {
    wrap()
    expect(screen.getByRole('link', { name: 'no' })).toHaveAttribute('href', '/no/cv')
    expect(screen.getByRole('link', { name: 'en' })).toHaveAttribute('href', '/en/cv')
  })

  it('marks the active locale', () => {
    wrap()
    expect(screen.getByRole('link', { name: 'no' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'en' })).not.toHaveAttribute('aria-current')
  })
})
