'use client'

import { MessageSquareHeart, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { feedbackMailto } from '@/lib/feedback'

/**
 * Shown once after a download: what the beta means for pricing, plus an
 * optional line of feedback.
 *
 * It appears after the export rather than before it, so it never stands between
 * someone and the file they came for.
 */
export function ExportFeedback({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const t = useTranslations('beta')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.document.addEventListener('keydown', onKeyDown)
    return () => window.document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const mailto = feedbackMailto(message, 'CVApp beta')

  function handleSend() {
    if (mailto) window.location.href = mailto
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      <div
        aria-labelledby="export-feedback-title"
        aria-modal="true"
        className="relative m-4 flex w-full max-w-md flex-col gap-4 rounded-3xl bg-card p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold" id="export-feedback-title">
            <MessageSquareHeart aria-hidden="true" className="size-5 text-brand" />
            {t('thanksTitle')}
          </h2>
          <button
            aria-label={t('close')}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <p className="rounded-2xl bg-brand-soft/60 p-3 text-sm text-brand-strong">
          {t('thanksFree')}
        </p>

        {sent ? (
          <p className="text-sm font-medium text-brand-strong">{t('sent')}</p>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">{t('feedbackPrompt')}</span>
              <textarea
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition duration-150 hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/20"
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t('feedbackPlaceholder')}
                rows={3}
                value={message}
              />
            </label>

            {mailto ? null : (
              <p className="text-xs text-muted-foreground">{t('noDestination')}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong"
                onClick={onClose}
                type="button"
              >
                {t('skip')}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong disabled:translate-y-0 disabled:opacity-40"
                disabled={!message.trim() || !mailto}
                onClick={handleSend}
                type="button"
              >
                {t('send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
