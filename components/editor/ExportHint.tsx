'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { DialogPortal } from '@/components/ui/DialogPortal'

/**
 * Shown once, before a mobile user's first export.
 *
 * On iOS `window.print()` surfaces as the share sheet rather than a print
 * dialog. Without this, a user taps Download PDF, sees a share sheet and
 * reasonably concludes the app is broken.
 */
export function ExportHint({
  open,
  onContinue,
  onCancel,
}: {
  open: boolean
  onContinue: () => void
  onCancel: () => void
}) {
  const t = useTranslations('editor')
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    confirmRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.document.addEventListener('keydown', onKeyDown)
    return () => window.document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <DialogPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button
          aria-hidden="true"
          className="absolute inset-0 bg-foreground/40"
          onClick={onCancel}
          tabIndex={-1}
          type="button"
        />

        <div
          aria-labelledby="export-hint-title"
          aria-modal="true"
          className="relative m-4 flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-card p-6 shadow-2xl"
          role="dialog"
        >
          <h2 className="text-lg font-bold" id="export-hint-title">
            {t('exportHintTitle')}
          </h2>

          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
            <li>{t('exportHintStep1')}</li>
            <li>{t('exportHintStep2')}</li>
          </ol>

          <div className="flex justify-end gap-2">
            <button
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong"
              onClick={onCancel}
              type="button"
            >
              {t('exportHintCancel')}
            </button>
            <button
              className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-ink transition hover:bg-brand-strong"
              onClick={onContinue}
              ref={confirmRef}
              type="button"
            >
              {t('exportHintContinue')}
            </button>
          </div>
        </div>
      </div>
    </DialogPortal>
  )
}
