'use client'

import { LayoutGrid } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { getTemplate, TEMPLATES } from '@/components/cv/templates'
import { TemplateCard } from '@/components/gallery/TemplateCard'
import { Link, useRouter } from '@/i18n/navigation'
import { PAPER, mmToPx } from '@/lib/print/paper'

/**
 * The same cards as the gallery, so a template looks and behaves identically
 * wherever it is shown. Choosing one here starts a CV directly.
 */
/**
 * How many cards each breakpoint shows, chosen so the "+N" tile always lands
 * as the last item of a full row rather than alone on one of its own.
 *
 * The grid is 2, 3, 4 and 5 columns. Adding the tile, that is 6, 6, 8 and 10
 * items: three full rows on a phone and two everywhere else. Which cards are
 * visible is decided in CSS rather than by measuring the window, so the
 * server renders the same markup the browser keeps and nothing shifts after
 * hydration.
 */
const SHOWN = 9
const VISIBILITY = [
  // The first five show everywhere: five plus the tile is three rows of two
  // on a phone and two rows of three at `sm`.
  '',
  '',
  '',
  '',
  '',
  // Four columns needs seven cards to fill the second row.
  'hidden lg:flex',
  'hidden lg:flex',
  // Five columns needs nine.
  'hidden xl:flex',
  'hidden xl:flex',
]

export function LandingTemplates() {
  const t = useTranslations('gallery')
  const router = useRouter()

  const shown = TEMPLATES.slice(0, SHOWN)

  // Imported on the click rather than at the top of the file. This is the
  // only thing on the landing page that needs the document store, and a
  // static import put the store, immer and zod into the first JavaScript
  // every visitor downloads - to serve a button most of them never press.
  async function handleChoose(templateId: string) {
    const { useDocuments } = await import('@/lib/store/documents')
    const template = getTemplate(templateId)
    const id = useDocuments.getState().createDocument({
      templateId: template.id,
      accent: template.defaultAccent,
      fontPairId: template.defaultFontPairId,
    })
    router.push(`/cv/${id}`)
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
      {shown.map((template, index) => (
        <TemplateCard
          className={VISIBILITY[index]}
          key={template.id}
          onChoose={handleChoose}
          template={template}
        />
      ))}

      {/* The last tile is the way to the rest, rather than a text link above
          the grid: it sits where the eye already is after scanning the cards,
          and it matches the strip in the editor. Sized by the same aspect
          ratio as a card so the grid row stays even. */}
      {TEMPLATES.length > SHOWN ? (
        <li className="flex flex-col gap-2.5">
          <Link
            // The total, not the remainder: the remainder differs per
            // breakpoint and an accessible name cannot be responsive.
            aria-label={t('moreLabel', { count: TEMPLATES.length })}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card text-muted-foreground transition duration-200 hover:-translate-y-1 hover:border-brand hover:text-brand-strong hover:shadow-[0_18px_45px_-18px_rgb(0_0_0/0.25)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/templates"
            style={{ aspectRatio: `${mmToPx(PAPER.a4.widthMm)} / ${mmToPx(PAPER.a4.heightMm)}` }}
          >
            <LayoutGrid aria-hidden="true" className="size-6" />
            {/* One per breakpoint, because how many are left depends on how
                many fit. Hidden from assistive technology, which has the
                total in the link's name already. */}
            <span aria-hidden="true" className="text-xl font-bold">
              <span className="lg:hidden">+{TEMPLATES.length - 5}</span>
              <span className="hidden lg:inline xl:hidden">+{TEMPLATES.length - 7}</span>
              <span className="hidden xl:inline">+{TEMPLATES.length - 9}</span>
            </span>
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">
            {t('allTemplates')}
          </span>
        </li>
      ) : null}
    </ul>
  )
}
