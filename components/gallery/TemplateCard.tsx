'use client'

import { useTranslations } from 'next-intl'

import { CvDocument } from '@/components/cv/CvDocument'
import type { Template } from '@/components/cv/types'
import { mmToPx, PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

/** Thumbnail scale. The page width is fixed, so the card width follows from it. */
const SCALE = 0.34

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
    <li className="flex flex-col gap-3">
      <button
        aria-label={template.name}
        className="group overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgb(0_0_0/0.3)] ring-1 ring-neutral-200 transition hover:-translate-y-1 hover:shadow-[0_18px_45px_-15px_rgb(0_0_0/0.35)] focus-visible:ring-2 focus-visible:ring-neutral-900"
        onClick={() => onChoose(template.id)}
        style={{ width: pageWidth * SCALE, height: pageHeight * SCALE }}
        type="button"
      >
        {/* The thumbnail is decorative: the button's aria-label names the
            template, so screen readers do not read a whole CV per card. */}
        <span aria-hidden="true" className="block">
          <span
            className="block origin-top-left"
            style={{ transform: `scale(${SCALE})`, width: pageWidth }}
          >
            <CvDocument document={preview} />
          </span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{template.name}</span>
        <span className="text-xs text-neutral-500">{t('choose')}</span>
      </div>
    </li>
  )
}
