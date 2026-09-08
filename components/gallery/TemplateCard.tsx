'use client'

import { useTranslations } from 'next-intl'

import { CvDocument } from '@/components/cv/CvDocument'
import type { Template } from '@/components/cv/types'
import { mmToPx, PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

/**
 * Card width is capped rather than fluid: a CV thumbnail rendered huge on a
 * wide monitor is harder to compare, not easier. The grid adds columns instead.
 */
export function TemplateCard({
  template,
  document,
  onChoose,
}: {
  template: Template
  document: CvDocumentData
  onChoose: (templateId: string) => void
}) {
  const t = useTranslations('gallery')
  const pageWidth = mmToPx(PAPER[document.paper].widthMm)
  const pageHeight = mmToPx(PAPER[document.paper].heightMm)

  const preview: CvDocumentData = {
    ...document,
    theme: {
      ...document.theme,
      templateId: template.id,
      accent: template.defaultAccent,
      fontPairId: template.defaultFontPairId ?? document.theme.fontPairId,
    },
  }

  return (
    <li className="group flex flex-col gap-2.5">
      <button
        aria-label={template.name}
        className="relative block w-full overflow-hidden rounded-xl bg-white ring-1 ring-border transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_45px_-18px_rgb(0_0_0/0.4)] group-hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        onClick={() => onChoose(template.id)}
        // container-type lets the thumbnail scale to whatever width the grid gives
        // the card, so one component works at every breakpoint.
        style={{ aspectRatio: `${pageWidth} / ${pageHeight}`, containerType: 'inline-size' }}
        type="button"
      >
        {/* Decorative: the button is labelled, so a screen reader is not read
            an entire CV for every card. Scaled by container width so the card
            can size itself responsively. */}
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: pageWidth,
            height: pageHeight,
            // length / length yields a unitless number, which is what scale() needs.
            transform: `scale(calc(100cqw / ${pageWidth}px))`,
          }}
        >
          <CvDocument document={preview} />
        </span>

        <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent p-3 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-ink shadow-lg">
            {t('choose')}
          </span>
        </span>
      </button>

      <span className="text-sm font-semibold">{template.name}</span>
    </li>
  )
}
