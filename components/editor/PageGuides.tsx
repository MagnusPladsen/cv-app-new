'use client'

import { mmToPx, pageBreakOffsetsMm } from '@/lib/print/paper'
import type { PaperId } from '@/lib/schema/cv'

/**
 * Dashed rules showing where the printed page will break. Offsets are measured
 * from the top of the content box, so each guide is one absolutely positioned
 * element inside the unscaled document wrapper.
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
  const offsets = pageBreakOffsetsMm(contentHeightMm, paper, marginMm)
  if (offsets.length === 0) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0">
      {offsets.map((offsetMm, index) => (
        <div
          className="absolute inset-x-0 border-t border-dashed border-brand/40"
          data-testid="page-guide"
          key={offsetMm}
          style={{ top: mmToPx(offsetMm) }}
        >
          <span className="absolute -top-2 right-1 bg-card px-1 text-[10px] text-muted-foreground/70">
            {index + 2}
          </span>
        </div>
      ))}
    </div>
  )
}
