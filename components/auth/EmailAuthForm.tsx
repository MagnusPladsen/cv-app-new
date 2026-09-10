'use client'

import { LogIn, Mail, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { authErrorKey, MIN_PASSWORD_LENGTH } from '@/lib/auth/errors'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Mode = 'sign-in' | 'sign-up'

/**
 * Email and password, sign-in and sign-up in one form.
 *
 * One form rather than two pages: the fields are identical, and a person who
 * lands on the wrong one should not have to navigate to fix that.
 *
 * Sign-up does not sign anyone in. The project requires a confirmed address,
 * so the honest result is "check your inbox" rather than a session that does
 * not exist yet.
 */
export function EmailAuthForm({ next }: { next: string }) {
  const t = useTranslations('auth')
  const emailId = useId()
  const passwordId = useId()

  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const supabase = getBrowserSupabase()
    if (!supabase) return

    if (mode === 'sign-up' && password.length < MIN_PASSWORD_LENGTH) {
      setError(t('errorWeak'))
      return
    }

    setBusy(true)
    setError(null)

    if (mode === 'sign-in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)
      if (signInError) {
        setError(t(authErrorKey(signInError)))
        return
      }
      // A full navigation, not a client route change: the session lives in a
      // cookie the server has to see for the account page to render signed in.
      window.location.assign(next)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    setBusy(false)
    if (signUpError) {
      setError(t(authErrorKey(signUpError)))
      return
    }
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft/50 p-6 text-center">
        <Mail aria-hidden="true" className="size-6 text-brand" />
        <h2 className="text-lg font-bold">{t('checkInbox')}</h2>
        <p className="text-sm text-muted-foreground">{t('checkInboxBody', { email: sentTo })}</p>
      </div>
    )
  }

  const field =
    'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none'

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={emailId}>
          {t('emailLabel')}
        </label>
        <input
          autoComplete="email"
          className={field}
          id={emailId}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={passwordId}>
          {t('passwordLabel')}
        </label>
        <input
          // new-password on sign-up so a manager offers to generate one, and
          // current-password on sign-in so it offers the saved one.
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          className={field}
          id={passwordId}
          minLength={mode === 'sign-up' ? MIN_PASSWORD_LENGTH : undefined}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        {mode === 'sign-up' ? (
          <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
        ) : null}
      </div>

      {error ? (
        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:translate-y-0 disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {mode === 'sign-up' ? (
          <UserPlus aria-hidden="true" className="size-4" />
        ) : (
          <LogIn aria-hidden="true" className="size-4" />
        )}
        {busy ? t('working') : mode === 'sign-up' ? t('signUpAction') : t('signInAction')}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          className="font-semibold text-brand underline-offset-4 hover:underline"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setError(null)
          }}
          type="button"
        >
          {mode === 'sign-in' ? t('toSignUp') : t('toSignIn')}
        </button>

        {mode === 'sign-in' ? (
          <Link
            className="text-muted-foreground underline-offset-4 hover:text-brand-strong hover:underline"
            href="/glemt-passord"
          >
            {t('forgot')}
          </Link>
        ) : null}
      </div>
    </form>
  )
}
