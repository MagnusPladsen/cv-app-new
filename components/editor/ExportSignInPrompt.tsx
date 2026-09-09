'use client'

import { UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { SignInButtons } from '@/components/auth/SignInButtons'
import { DialogPortal } from '@/components/ui/DialogPortal'

/**
 * Offered once, when a signed-out user downloads a CV: sign in to keep it on
 * an account, or carry on as a guest.
 *
 * The guest button is the primary action and always works. Standing between
 * someone and the file they came for would be a worse product than never
 * asking, so this asks once and then remembers the answer.
 */
export function ExportSignInPrompt({
  open,
  onGuest,
  onCancel,
  next,
}: {
  open: boolean
  onGuest: () => void
  onCancel: () => void
  next: string
}) {
  const t = useTranslations('editor')
  const guestRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    guestRef.current?.focus()
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
          aria-labelledby="export-signin-title"
          aria-modal="true"
          className="relative m-4 flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-card p-6 shadow-2xl"
          role="dialog"
        >
          <div className="flex items-start gap-3">
            <UserRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold" id="export-signin-title">
                {t('exportSignInTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('exportSignInBody')}</p>
            </div>
          </div>

          <SignInButtons next={next} />

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <button
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={onGuest}
              ref={guestRef}
              type="button"
            >
              {t('exportGuest')}
            </button>
            {/* Says what guest actually costs. The CV is still saved - in this
                browser - so claiming it is not saved at all would be false, and
                would contradict the dashboard's own storage badge. */}
            <p className="text-xs text-muted-foreground">{t('exportGuestWarning')}</p>
          </div>
        </div>
      </div>
    </DialogPortal>
  )
}
