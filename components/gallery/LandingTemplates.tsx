'use client'

import { LayoutGrid } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { getTemplate, TEMPLATES } from '@/components/cv/templates'
import { TemplateCard } from '@/components/gallery/TemplateCard'
import { Link, useRouter } from '@/i18n/navigation'
import { PAPER, mmToPx } from '@/lib/print/paper'
import { useDocuments } from '@/lib/store/documents'

/**
 * The same cards as the gallery, so a template looks and behaves identically
 * wherever it is shown. Choosing one here starts a CV directly.
 */
export function LandingTemplates({ limit }: { limit?: number }) {
  const t = useTranslations('gallery')
  const router = useRouter()
  const createDocument = useDocuments((state) => state.createDocument)

  const shown = limit ? TEMPLATES.slice(0, limit) : TEMPLATES
  const remaining = TEMPLATES.length - shown.length

  function handleChoose(templateId: string) {
    const template = getTemplate(templateId)
    const id = createDocument({
      templateId: template.id,
      accent: template.defaultAccent,
      fontPairId: template.defaultFontPairId,
    })
    router.push(`/cv/${id}`)
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
      {shown.map((template) => (
        <TemplateCard key={template.id} onChoose={handleChoose} template={template} />
      ))}

      {/* The last tile is the way to the rest, rather than a text link above
          the grid: it sits where the eye already is after scanning the cards,
          and it matches the strip in the editor. Sized by the same aspect
          ratio as a card so the grid row stays even. */}
      {remaining > 0 ? (
        <li className="flex flex-col gap-2.5">
          <Link
            aria-label={t('moreLabel', { count: remaining })}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card text-muted-foreground transition duration-200 hover:-translate-y-1 hover:border-brand hover:text-brand-strong hover:shadow-[0_18px_45px_-18px_rgb(0_0_0/0.25)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            href="/templates"
            style={{ aspectRatio: `${mmToPx(PAPER.a4.widthMm)} / ${mmToPx(PAPER.a4.heightMm)}` }}
          >
            <LayoutGrid aria-hidden="true" className="size-6" />
            <span className="text-xl font-bold">+{remaining}</span>
          </Link>
          <span className="text-sm font-semibold text-muted-foreground">
            {t('allTemplates')}
          </span>
        </li>
      ) : null}
    </ul>
  )
}
