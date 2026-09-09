import { FileQuestion } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

/**
 * A branded 404, and a Content-Security-Policy fix.
 *
 * Next's built-in not-found page carries an inline <style> block. The app's
 * CSP allows inline style *attributes* but not inline style *blocks*, so the
 * default page rendered unstyled with a console violation. Replacing it is
 * both the better product answer and the one that does not require loosening
 * the policy.
 */
export default async function NotFound() {
  const t = await getTranslations('notFound')

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-20 text-center sm:px-6 sm:py-28">
      <FileQuestion aria-hidden="true" className="size-10 text-brand" />
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-1">
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          href="/"
        >
          {t('home')}
        </Link>
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          href="/cv"
        >
          {t('myCvs')}
        </Link>
      </div>
    </main>
  )
}
