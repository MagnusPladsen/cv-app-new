'use client'

import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { authErrorKey, MIN_PASSWORD_LENGTH } from '@/lib/auth/errors'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Sets a new password.
 *
 * Reached from the emailed reset link, which the callback route has already
 * exchanged for a session — so this needs no token of its own, only an
 * authenticated `updateUser`. Someone opening this page without that session
 * simply gets an error, which is the correct outcome.
 */
export function NewPasswordForm({ next }: { next: string }) {
  const t = useTranslations('auth')
  const passwordId = useId()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const supabase = getBrowserSupabase()
    if (!supabase) return

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('errorWeak'))
      return
    }

    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)

    if (updateError) {
      setError(t(authErrorKey(updateError)))
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft/50 p-6 text-center">
        <CheckCircle2 aria-hidden="true" className="size-6 text-brand" />
        <p className="text-sm font-medium">{t('newPasswordDone')}</p>
        <a
          className="text-sm font-semibold text-brand hover:underline"
          // A full navigation so the server sees the session cookie.
          href={next}
        >
          {t('account')}
        </a>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={passwordId}>
          {t('passwordLabel')}
        </label>
        <input
          autoComplete="new-password"
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          id={passwordId}
          minLength={MIN_PASSWORD_LENGTH}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
      </div>

      {error ? (
        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? t('working') : t('newPasswordAction')}
      </button>
    </form>
  )
}
