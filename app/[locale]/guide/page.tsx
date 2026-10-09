import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { GuideView } from '@/components/guide/GuideView'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { GUIDE } from '@/lib/guide'
import { pageMeta } from '@/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return pageMeta({
    locale,
    path: '/guide',
    title: t('guideTitle'),
    description: t('guideDescription'),
  })
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!routing.locales.includes(locale as 'no' | 'en')) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('guide')
  const document = GUIDE[locale as 'no' | 'en']

  /**
   * The FAQ, in the vocabulary Google reads. Every question and answer here is
   * also on the page: marking up something a visitor cannot see is what the
   * rich-results guidelines call a violation, and it is also just dishonest.
   */
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: document.faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        type="application/ld+json"
      />

      <GuideView document={document} />

      {/* The point of arriving here is leaving with a CV, not with advice. */}
      <aside className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 p-5">
        <h2 className="text-lg font-bold text-brand-strong">{t('ctaTitle')}</h2>
        <p className="text-foreground/80">{t('ctaBody')}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/cv"
          >
            {t('ctaStart')}
          </Link>
          <Link
            className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:border-brand hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/templates"
          >
            {t('ctaTemplates')}
          </Link>
        </div>
      </aside>
    </main>
  )
}
