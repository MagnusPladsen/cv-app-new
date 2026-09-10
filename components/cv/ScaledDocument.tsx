'use client'

import { useEffect, useRef, useState } from 'react'

import { CvDocument } from '@/components/cv/CvDocument'
import { PAPER, mmToPx } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

/**
 * A CV shrunk to fit whatever width its parent gives it.
 *
 * The scale is applied twice, on purpose:
 *
 * 1. A CSS `transform` using `tan(atan2(100cqw, <width>px))`, which is a
 *    container-query width divided by a fixed length. It renders correctly on
 *    the server, so a modern browser paints the right size immediately.
 * 2. A measured value from a ResizeObserver, which overrides the CSS once
 *    mounted.
 *
 * The second exists because the first is not dependable. `calc(100cqw / Npx)`
 * is CSS Values 4 and Firefox drops it; `tan(atan2(...))` covers more engines
 * but not all of them, and a browser that understands neither renders a full
 * size A4 page inside a thumbnail. Measuring cannot be unsupported.
 */
export function ScaledDocument({
  document: doc,
  paper = 'a4',
}: {
  document: CvDocumentData
  paper?: keyof typeof PAPER
}) {
  const pageWidth = mmToPx(PAPER[paper].widthMm)
  const pageHeight = mmToPx(PAPER[paper].heightMm)

  const hostRef = useRef<HTMLSpanElement | null>(null)
  const [measured, setMeasured] = useState<number | null>(null)

  useEffect(() => {
    const host = hostRef.current?.parentElement
    if (!host || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      // clientWidth, not getBoundingClientRect: a rotated ancestor makes the
      // bounding box wider than the element, which would scale the CV down.
      const width = host.clientWidth
      if (width > 0) setMeasured(width / pageWidth)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [pageWidth])

  return (
    <span
      aria-hidden="true"
      className="absolute top-0 left-0 origin-top-left"
      ref={hostRef}
      style={{
        width: pageWidth,
        height: pageHeight,
        transform:
          measured === null
            ? // tan(atan2(a, b)) is a/b as a plain number. The obvious
              // calc(a / b) is unimplemented in Firefox.
              `scale(tan(atan2(100cqw, ${pageWidth}px)))`
            : `scale(${measured})`,
      }}
    >
      {/* Always decorative: this component exists only for thumbnails. */}
      <CvDocument decorative document={doc} />
    </span>
  )
}
