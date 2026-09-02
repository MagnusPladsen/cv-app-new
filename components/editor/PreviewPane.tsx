'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { CvDocument } from '@/components/cv/CvDocument'
import { PAPER, countPages, mmToPx, pxToMm } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { PageGuides } from './PageGuides'

/**
 * Renders the CV at its true paper width and scales it down to fit the pane.
 * The scale lives on this wrapper, never on the `.cv-doc` node itself, so the
 * markup the print pipeline clones is unscaled — and so the height measured
 * for the page guides is the real printed height.
 */
export function PreviewPane({
  document,
  containerRef,
}: {
  document: CvDocumentData
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const t = useTranslations('editor')
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)
  const [contentHeightMm, setContentHeightMm] = useState(0)

  const pageWidthPx = mmToPx(PAPER[document.paper].widthMm)
  const pageHeightPx = mmToPx(PAPER[document.paper].heightMm)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      const available = frame.clientWidth
      if (available > 0) setScale(Math.min(1, available / pageWidthPx))

      const doc = containerRef.current?.querySelector<HTMLElement>('.cv-doc')
      // offsetHeight ignores the wrapper's transform, so this is the real
      // unscaled document height.
      if (doc) setContentHeightMm(pxToMm(doc.offsetHeight))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)

    const doc = containerRef.current?.querySelector<HTMLElement>('.cv-doc')
    if (doc) observer.observe(doc)

    return () => observer.disconnect()
  }, [containerRef, pageWidthPx, document])

  const pages = countPages(contentHeightMm, document.paper)
  const renderedHeightPx = Math.max(pageHeightPx, mmToPx(contentHeightMm))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          {t('pageCount', { count: pages })}
        </span>
      </div>

      <div className="w-full overflow-auto" ref={frameRef}>
        <div style={{ height: renderedHeightPx * scale, width: pageWidthPx * scale }}>
          <div
            className="relative origin-top-left shadow-[0_10px_40px_-12px_rgb(0_0_0/0.25)]"
            ref={containerRef}
            style={{ transform: `scale(${scale})`, width: pageWidthPx }}
          >
            <CvDocument document={document} />
            <PageGuides contentHeightMm={contentHeightMm} paper={document.paper} />
          </div>
        </div>
      </div>
    </div>
  )
}
