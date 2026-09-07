import { getTranslations } from 'next-intl/server'

import { CvDocument } from '@/components/cv/CvDocument'
import { TEMPLATES } from '@/components/cv/templates'
import { Link } from '@/i18n/navigation'
import { mmToPx, PAPER } from '@/lib/print/paper'
import { createDemoDocument } from '@/lib/schema/demo'

const SHOWCASE = ['bergen', 'trondheim', 'studio']
const THUMB_SCALE = 0.24

export default async function HomePage() {
  const t = await getTranslations()
  const demo = createDemoDocument()
  const pageWidth = mmToPx(PAPER.a4.widthMm)
  const pageHeight = mmToPx(PAPER.a4.heightMm)

  const showcase = SHOWCASE.map((id) => TEMPLATES.find((template) => template.id === id)).filter(
    (template) => template !== undefined,
  )

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16 sm:py-24">
      <section className="flex flex-col gap-7">
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
          <Link
            className="rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-brand-ink transition hover:-translate-y-0.5 hover:bg-brand-strong"
            href="/templates"
          >
            {t('landing.cta')}
          </Link>
          <Link
            className="rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold transition hover:border-brand hover:text-brand-strong"
            href="/cv"
          >
            {t('nav.myCvs')}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {(['point1', 'point2', 'point3'] as const).map((point) => (
          <div
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6"
            key={point}
          >
            <h2 className="text-base font-bold text-brand-strong">
              {t(`landing.${point}Title`)}
            </h2>
            <p className="text-sm text-muted-foreground">{t(`landing.${point}Body`)}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">{t('nav.templates')}</h2>
          <Link className="text-sm font-semibold text-brand underline-offset-4 hover:underline" href="/templates">
            {t('landing.secondary')}
          </Link>
        </div>

        <ul aria-hidden="true" className="flex flex-wrap gap-6">
          {showcase.map((template) => (
            <li
              className="overflow-hidden rounded-xl bg-card shadow-[0_10px_35px_-14px_rgb(0_0_0/0.35)] ring-1 ring-border"
              key={template.id}
              style={{ width: pageWidth * THUMB_SCALE, height: pageHeight * THUMB_SCALE }}
            >
              <span
                className="block origin-top-left"
                style={{ transform: `scale(${THUMB_SCALE})`, width: pageWidth }}
              >
                <CvDocument
                  document={{
                    ...demo,
                    theme: {
                      ...demo.theme,
                      templateId: template.id,
                      accent: template.defaultAccent,
                      fontPairId: template.defaultFontPairId ?? demo.theme.fontPairId,
                    },
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
