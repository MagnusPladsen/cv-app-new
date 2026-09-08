'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { CvDocument } from '@/components/cv/CvDocument'
import { documentMarginMm } from '@/components/cv/margin'
import { contentHeightMm } from '@/lib/print/measure'
import { PAPER, countPages, mmToPx } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { PageGuides } from './PageGuides'

/**
 * Renders the CV at its true paper width and scales it down to fit the pane.
 * The scale lives on this wrapper, never on the `.cv-doc` node itself, so the
 * markup the print pipeline clones is unscaled — and so the height measured
 * for the page guides is the real printed height.
 */
/** Matches the p-4 on the scroll frame. */
const PREVIEW_PADDING_PX = 16

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
  const [contentMm, setContentMm] = useState(0)
  const [docHeightPx, setDocHeightPx] = useState(0)

  const pageWidthPx = mmToPx(PAPER[document.paper].widthMm)
  const pageHeightPx = mmToPx(PAPER[document.paper].heightMm)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      // The frame is padded, so subtract it or the page overflows its container.
      const available = frame.clientWidth - PREVIEW_PADDING_PX * 2
      if (available > 0) setScale(Math.min(1, available / pageWidthPx))

      const doc = containerRef.current?.querySelector<HTMLElement>('.cv-doc')
      if (!doc) return

      // Two different heights, and mixing them up clips the page:
      // - contentMm is the content box, which is what page counting needs
      // - offsetHeight is the whole sheet including its margins, which is what
      //   the scaled wrapper has to reserve room for
      setContentMm(contentHeightMm(doc, getComputedStyle(doc)))
      setDocHeightPx(doc.offsetHeight)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)

    const doc = containerRef.current?.querySelector<HTMLElement>('.cv-doc')
    if (doc) observer.observe(doc)

    return () => observer.disconnect()
  }, [containerRef, pageWidthPx, document])

  const marginMm = documentMarginMm(document)
  const pages = countPages(contentMm, document.paper, marginMm)
  const renderedHeightPx = Math.max(pageHeightPx, docHeightPx)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <span className="rounded-full bg-sand-deep px-3 py-1 text-xs font-medium text-muted-foreground">
          {t('pageCount', { count: pages })}
        </span>
      </div>

      <div className="w-full overflow-auto rounded-md bg-sand-deep p-4" ref={frameRef}>
        <div style={{ height: renderedHeightPx * scale, width: pageWidthPx * scale }}>
          <div
            className="relative origin-top-left shadow-[0_10px_40px_-12px_rgb(0_0_0/0.25)]"
            /* The export clones the .cv-doc inside this element. Thumbnails
               elsewhere on the page render .cv-doc too, so the marker makes the
               contract explicit instead of implicit in a ref. */
            data-cv-preview=""
            ref={containerRef}
            style={{ transform: `scale(${scale})`, width: pageWidthPx }}
          >
            <CvDocument document={document} />
            <PageGuides contentHeightMm={contentMm} marginMm={marginMm} paper={document.paper} />
          </div>
        </div>
      </div>
    </div>
  )
}
