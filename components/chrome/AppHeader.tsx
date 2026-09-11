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

  // The blur is a deliberate cost. A sticky backdrop-filter repaints a blurred
  // strip the width of the viewport on every scrolled frame, and one Firefox
  // run measured that as a 10ms frame becoming 30ms. It was removed on that
  // basis and then put back: the slowness it was blamed for turned out to be
  // the dev server, and the look is wanted. If scrolling is ever genuinely
  // slow in a real browser, this is the first thing to try removing - but
  // measure against a production build first.
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-sand/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded text-base font-extrabold tracking-tight text-brand transition hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:gap-2 sm:text-lg"
            href="/"
          >
            <Logo className="size-7 shrink-0" />
            CVApp
          </Link>
          <BetaBadge />
        </div>

        <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
          {/* Hidden on phones, where the row cannot fit four items beside the
              logo. Templates stay one tap away: the landing page leads with
              them, "Lag ny CV" opens the gallery, and the editor carries the
              template strip. */}
          <Link
            className="hidden rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition hover:bg-brand-soft hover:text-brand-strong sm:inline-flex"
            href="/templates"
          >
            {t('templates')}
          </Link>
          <Link
            className="rounded-full px-2 py-1.5 font-medium whitespace-nowrap transition hover:bg-brand-soft hover:text-brand-strong sm:px-3"
            href="/cv"
          >
            {t('myCvs')}
          </Link>
          <AccountMenu />

          {/* On a phone only the other language is shown: rendering both
              spends width on a link that does nothing, and that width is what
              the beta badge needs. From sm both appear, with the current one
              marked. */}
          <span aria-label={t('switchLocale')} className="ml-1 flex items-center gap-0.5 sm:ml-2">
            {routing.locales.map((candidate) => (
              <Link
                aria-current={candidate === locale ? 'true' : undefined}
                className={`rounded-full px-2 py-1 text-xs font-semibold uppercase transition sm:px-2.5 ${
                  candidate === locale
                    ? 'hidden bg-brand text-brand-ink sm:inline-block'
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
