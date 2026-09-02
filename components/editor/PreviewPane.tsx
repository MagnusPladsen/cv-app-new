'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { CvDocument } from '@/components/cv/CvDocument'
import { PAPER, mmToPx } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

/**
 * Renders the CV at its true paper width and scales it down to fit the pane.
 * The scale lives on this wrapper, never on the `.cv-doc` node itself, so the
 * markup the print pipeline clones is unscaled.
 */
export function PreviewPane({
  document,
  containerRef,
}: {
  document: CvDocumentData
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  const pageWidthPx = mmToPx(PAPER[document.paper].widthMm)
  const pageHeightPx = mmToPx(PAPER[document.paper].heightMm)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      const available = frame.clientWidth
      if (available > 0) setScale(Math.min(1, available / pageWidthPx))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [pageWidthPx])

  return (
    <div className="w-full overflow-auto" ref={frameRef}>
      <div style={{ height: pageHeightPx * scale, width: pageWidthPx * scale }}>
        <div
          className="origin-top-left shadow-[0_10px_40px_-12px_rgb(0_0_0/0.25)]"
          style={{ transform: `scale(${scale})`, width: pageWidthPx }}
          ref={containerRef}
        >
          <CvDocument document={document} />
        </div>
      </div>
    </div>
  )
}
