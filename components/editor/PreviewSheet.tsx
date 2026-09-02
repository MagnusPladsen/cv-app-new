'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, type RefObject } from 'react'

import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { PreviewPane } from './PreviewPane'

export function PreviewSheet({
  document,
  containerRef,
  open,
  onOpenChange,
}: {
  document: CvDocumentData
  containerRef: RefObject<HTMLDivElement | null>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('editor')
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return

    openerRef.current = window.document.activeElement
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.document.addEventListener('keydown', onKeyDown)

    return () => {
      window.document.removeEventListener('keydown', onKeyDown)
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Presentational: Escape and the close button are the real affordances,
          so the backdrop stays out of the accessibility tree and the tab order. */}
      <button
        aria-hidden="true"
        className="absolute inset-0 bg-neutral-900/40"
        onClick={() => onOpenChange(false)}
        tabIndex={-1}
        type="button"
      />

      <div
        aria-label={t('preview')}
        aria-modal="true"
        className="relative max-h-[85dvh] overflow-auto rounded-t-3xl bg-white p-4 shadow-2xl"
        role="dialog"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">{t('preview')}</span>
          <button
            className="rounded-full px-3 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            onClick={() => onOpenChange(false)}
            ref={closeRef}
            type="button"
          >
            {t('closePreview')}
          </button>
        </div>

        <PreviewPane containerRef={containerRef} document={document} />
      </div>
    </div>
  )
}
