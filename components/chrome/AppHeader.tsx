'use client'

import { useLocale, useTranslations } from 'next-intl'

import { AccountMenu } from '@/components/auth/AccountMenu'
import { Logo } from '@/components/chrome/Logo'
import { BetaBadge } from '@/components/chrome/BetaBadge'
import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

export function AppHeader() {
  const t = useTranslations('nav')
  const locale = useLocale()
  // The locale-aware pathname, so switching language keeps you on this page.
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-sand/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex items-center gap-2 rounded text-lg font-extrabold tracking-tight text-brand transition hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/"
          >
            <Logo className="size-7 shrink-0" />
            CVApp
          </Link>
          <BetaBadge />
        </div>

        <nav className="flex items-center gap-1 text-sm">
          {/* Hidden on phones, where the row cannot fit four items beside the
              logo. Templates stay one tap away: the landing page leads with
              them, "Lag ny CV" opens the gallery, and the editor carries the
              template strip. */}
          <Link
            className="hidden rounded-full px-3 py-1.5 font-medium transition hover:bg-brand-soft hover:text-brand-strong sm:inline-flex"
            href="/templates"
          >
            {t('templates')}
          </Link>
          <Link
            className="rounded-full px-3 py-1.5 font-medium transition hover:bg-brand-soft hover:text-brand-strong"
            href="/cv"
          >
            {t('myCvs')}
          </Link>
          <AccountMenu />

          <span aria-label={t('switchLocale')} className="ml-2 flex items-center gap-0.5">
            {routing.locales.map((candidate) => (
              <Link
                aria-current={candidate === locale ? 'true' : undefined}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${
                  candidate === locale
                    ? 'bg-brand text-brand-ink'
                    : 'text-muted-foreground hover:bg-brand-soft hover:text-brand-strong'
                }`}
                href={pathname}
                key={candidate}
                locale={candidate}
              >
                {candidate}
              </Link>
            ))}
          </span>
        </nav>
      </div>
    </header>
  )
}
