import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

/**
 * Art. 13 requires the privacy policy to be provided, which in practice means
 * reachable from wherever the user is. An unlinked policy is the same defect
 * as no policy.
 */
export async function AppFooter() {
  const t = await getTranslations('footer')

  return (
    <footer className="mt-16 border-t border-border/70 bg-sand/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{t('tagline')}</p>
        <nav className="flex flex-wrap gap-4">
          <Link
            className="rounded transition hover:text-brand-strong hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/personvern"
          >
            {t('privacy')}
          </Link>
          <Link
            className="rounded transition hover:text-brand-strong hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/vilkar"
          >
            {t('terms')}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
