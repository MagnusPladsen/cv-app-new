'use client'

import { CvDocument } from '@/components/cv/CvDocument'
import type { Template } from '@/components/cv/types'
import { mmToPx, PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

/**
 * A template thumbnail.
 *
 * Always rendered with the demo CV rather than the user's own: a new CV is
 * empty, and an empty sheet shows nothing about a template except its colour.
 */
export function TemplateThumb({
  template,
  document,
  width,
  active,
  onSelect,
}: {
  template: Template
  document: CvDocumentData
  width: number
  active: boolean
  onSelect: (templateId: string) => void
}) {
  const pageWidth = mmToPx(PAPER[document.paper].widthMm)
  const pageHeight = mmToPx(PAPER[document.paper].heightMm)

  return (
    <button
      aria-current={active ? 'true' : undefined}
      aria-label={template.name}
      className={`group block shrink-0 overflow-hidden rounded-lg bg-white ring-2 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgb(0_0_0/0.45)] focus-visible:ring-brand focus-visible:outline-none ${
        active ? 'ring-brand' : 'ring-border hover:ring-brand/60'
      }`}
      onClick={() => onSelect(template.id)}
      style={{ width, height: width * (pageHeight / pageWidth) }}
      type="button"
    >
      <span
        aria-hidden="true"
        className="block origin-top-left"
        style={{
          width: pageWidth,
          height: pageHeight,
          transform: `scale(${width / pageWidth})`,
        }}
      >
        <CvDocument
          document={{
            ...document,
            theme: {
              ...document.theme,
              templateId: template.id,
              accent: template.defaultAccent,
              fontPairId: template.defaultFontPairId ?? document.theme.fontPairId,
            },
          }}
        />
      </span>
    </button>
  )
}
