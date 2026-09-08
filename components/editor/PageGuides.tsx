'use client'

import { useTranslations } from 'next-intl'

import { mmToPx, pageBreakOffsetsMm } from '@/lib/print/paper'
import type { PaperId } from '@/lib/schema/cv'

/**
 * Where the printed page will actually break.
 *
 * This is one of the few things a CV editor must show plainly: what lands on
 * page one decides what a recruiter reads. A faint hairline is not enough, so
 * each break is drawn as a real paper edge — a shaded gap with a shadow above
 * and below it, labelled with the page it starts.
 */
export function PageGuides({
  contentHeightMm,
  paper,
  marginMm,
}: {
  contentHeightMm: number
  paper: PaperId
  /** The document's effective margin: a dense template may tighten it. */
  marginMm?: number
}) {
  const t = useTranslations('editor')
  const offsets = pageBreakOffsetsMm(contentHeightMm, paper, marginMm)
  if (offsets.length === 0) return null

  const marginPx = mmToPx(marginMm ?? 0)

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0">
      {offsets.map((offsetMm, index) => (
        <div
          className="absolute inset-x-0"
          data-testid="page-guide"
          key={offsetMm}
          // Offsets are measured from the top of the content box, so add the
          // page margin back to place the line on the paper.
          style={{ top: mmToPx(offsetMm) + marginPx }}
        >
          <div className="relative border-t-2 border-dashed border-brand/45">
            <span className="absolute -top-3 right-3 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-brand-ink shadow-md">
              {t('pageNumber', { page: index + 2 })}
            </span>
            {/* Reads as the bottom edge of one sheet meeting the top of the next. */}
            <span className="absolute inset-x-0 -top-4 h-4 bg-gradient-to-t from-foreground/10 to-transparent" />
            <span className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-foreground/10 to-transparent" />
          </div>
        </div>
      ))}
    </div>
  )
}
