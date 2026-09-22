import { BadgeCheck, FileText, Infinity, Laptop, LayoutGrid } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { TEMPLATES } from '@/components/cv/templates'
import { LandingTemplates } from '@/components/gallery/LandingTemplates'
import { GetStartedButton } from '@/components/landing/GetStartedButton'
import { ImportBanner } from '@/components/landing/ImportBanner'
import { HeroTemplates } from '@/components/landing/HeroTemplates'
import { Link } from '@/i18n/navigation'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  // Pins the locale so this page prerenders instead of being rendered per
  // request. Every page under [locale] needs it, not just the layout.
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations()

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-20">
      {/* Copy and fan side by side from lg, stacked below it. The fan is
          decorative, so it comes second in the DOM: a screen reader and a
          phone both get the headline and the call to action first. */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        <div className="flex flex-col gap-7">
        <p className="text-sm font-semibold tracking-widest text-brand-strong uppercase">
          {t('landing.lead')}
        </p>

        {/* The emphasised words come from the message, not from word position:
            "stolt av" and "proud of" do not sit in the same place. */}
        <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight text-balance sm:text-7xl">
          {t.rich('app.taglineRich', {
            hi: (chunks) => <span className="text-brand">{chunks}</span>,
          })}
        </h1>

        <div className="flex flex-wrap gap-3">
          <GetStartedButton label={t('landing.cta')} />
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/cv"
          >
            <LayoutGrid aria-hidden="true" className="size-4" />
            {t('nav.myCvs')}
          </Link>
        </div>
        </div>

        <HeroTemplates />
      </section>

      <ImportBanner locale={locale} />


      {/* Four, not a wall. Each one is something a person weighing CV builders
          actually decides on, and each is true of CVApp today rather than
          planned: no watermark ever, a PDF with real text in it, no cap, and
          a CV that does not pass through our servers. */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['point1', Infinity],
            ['point2', FileText],
            ['point3', BadgeCheck],
            ['point4', Laptop],
          ] as const
        ).map(([point, Icon]) => (
          <div
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6"
            key={point}
          >
            <Icon aria-hidden="true" className="size-5 text-brand" />
            <h2 className="text-base font-bold text-brand-strong">
              {t(`landing.${point}Title`)}
            </h2>
            <p className="text-sm text-muted-foreground">{t(`landing.${point}Body`)}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">{t('landing.templatesTitle', { count: TEMPLATES.length })}</h2>
        </div>

        {/* The same component the gallery uses, so a template looks and behaves
            identically wherever it appears. */}
        <LandingTemplates />
      </section>
    </main>
  )
}
