import { ArrowRight, FileUp, Lock } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

/**
 * The one thing here no other free Norwegian CV builder does: read the CV you
 * already have, in your own browser, without uploading it anywhere.
 *
 * Given a band of its own rather than a fifth feature tile. The four tiles
 * are properties of the product - unlimited, real PDF, no watermark, stays on
 * your machine - and this is something to go and do, so it is set apart: a
 * darker ground, a "Nytt" flag, and a small drawing of the thing happening.
 *
 * The drawing is inline SVG rather than an image: it is three rectangles and
 * a few rules, it inherits the theme's colours, and it costs no request.
 */
export async function ImportBanner({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'landing' })

  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand-strong text-white shadow-[0_30px_60px_-30px_rgb(13_95_89/0.6)]">
      {/* Two washes of light rather than a flat fill, so the band has some
          depth behind the drawing without a background image. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_0%,rgb(94_234_212/0.35),transparent_55%),radial-gradient(90%_90%_at_0%_100%,rgb(15_118_110/0.55),transparent_60%)]"
      />

      <div className="relative flex flex-col gap-8 p-7 sm:p-10 lg:flex-row lg:items-center lg:gap-12">
        <div className="flex max-w-2xl flex-col items-start gap-4">
          {/* A lit dot rather than another box: the band is already a filled
              panel with a button on it, and a third outlined shape on top of
              that reads as clutter. The halo is what makes it carry at this
              size. */}
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.2em] text-white/85 uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[#7fe8d8] shadow-[0_0_0_4px_rgb(127_232_216/0.22)]"
            />
            {t('importBadge')}
          </span>

          <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {t('importTitle')}
          </h2>

          <p className="text-base text-white/80">{t('importBody')}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
            <Link
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-strong transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-strong focus-visible:outline-none"
              href="/cv"
            >
              <FileUp aria-hidden="true" className="size-4" />
              {t('importCta')}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>

            <span className="inline-flex items-center gap-2 text-sm text-white/75">
              <Lock aria-hidden="true" className="size-4" />
              {t('importPrivacy')}
            </span>
          </div>
        </div>

        <ImportDrawing />
      </div>
    </section>
  )
}

/** A file on the left, a finished CV on the right, and the step between. */
function ImportDrawing() {
  return (
    <svg
      aria-hidden="true"
      className="w-full max-w-sm shrink-0 self-center lg:ml-auto lg:max-w-none lg:w-[26rem]"
      fill="none"
      role="presentation"
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* The old file: dog-eared, its text set grey and ragged. */}
      <g transform="rotate(-6 74 104)">
        <rect
          fill="rgb(255 255 255 / 0.12)"
          height="132"
          rx="10"
          stroke="rgb(255 255 255 / 0.35)"
          width="102"
          x="22"
          y="38"
        />
        <path d="M104 38h-18v18h18" fill="rgb(255 255 255 / 0.18)" />
        <g fill="rgb(255 255 255 / 0.45)">
          <rect height="6" rx="3" width="44" x="36" y="70" />
          <rect height="4" rx="2" width="62" x="36" y="86" />
          <rect height="4" rx="2" width="52" x="36" y="98" />
          <rect height="4" rx="2" width="58" x="36" y="110" />
          <rect height="4" rx="2" width="34" x="36" y="122" />
        </g>
        <text
          fill="rgb(255 255 255 / 0.7)"
          fontSize="11"
          fontWeight="700"
          letterSpacing="1"
          x="36"
          y="152"
        >
          PDF
        </text>
      </g>

      {/* The step between, as a chevron rather than a word: no translation. */}
      <g stroke="rgb(255 255 255 / 0.6)" strokeLinecap="round" strokeWidth="3">
        <path d="M140 100h28" />
        <path d="M160 92l8 8-8 8" />
      </g>

      {/* The CV that comes out: white paper, a teal accent bar, real rows. */}
      <g transform="rotate(4 246 100)">
        <rect fill="white" height="150" rx="12" width="116" x="188" y="26" />
        <rect fill="rgb(15 118 110)" height="150" rx="12" width="10" x="188" y="26" />
        <circle cx="222" cy="56" fill="rgb(15 118 110 / 0.18)" r="11" />
        <g fill="rgb(15 118 110 / 0.85)">
          <rect height="6" rx="3" width="42" x="240" y="49" />
          <rect height="4" rx="2" width="30" x="240" y="60" />
        </g>
        <g fill="rgb(15 23 42 / 0.16)">
          <rect height="4" rx="2" width="70" x="208" y="84" />
          <rect height="4" rx="2" width="58" x="208" y="96" />
          <rect height="4" rx="2" width="66" x="208" y="114" />
          <rect height="4" rx="2" width="48" x="208" y="126" />
          <rect height="4" rx="2" width="62" x="208" y="144" />
        </g>
      </g>
    </svg>
  )
}
