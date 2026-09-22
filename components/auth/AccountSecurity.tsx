'use client'

import { AtSign, KeyRound, LogOut } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { MIN_PASSWORD_LENGTH } from '@/lib/auth/errors'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Result = { kind: 'idle' } | { kind: 'done'; message: string } | { kind: 'failed'; message: string }

const field =
  'w-full max-w-xs rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none'

const button =
  'inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:translate-y-0 disabled:opacity-50'

/**
 * The three things an account page has to be able to do and could not: change
 * the password, change the address, and end every other session.
 *
 * Somebody who signed in with Google has no password at all - the same form
 * gives them one, which is what makes the account usable if they later lose
 * access to that Google account.
 */
export function AccountSecurity({ email, provider }: { email: string | null; provider: string | null }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const passwordId = useId()
  const emailId = useId()

  const [password, setPassword] = useState('')
  const [nextEmail, setNextEmail] = useState('')
  const [busy, setBusy] = useState<'password' | 'email' | 'sessions' | null>(null)
  const [result, setResult] = useState<Result>({ kind: 'idle' })

  /** No password of their own yet: the form offers to set one, not change one. */
  const hasPassword = provider === null || provider === 'email'

  async function change(kind: 'password' | 'email') {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setResult({ kind: 'failed', message: t('unavailable') })
      return
    }

    if (kind === 'password' && password.length < MIN_PASSWORD_LENGTH) {
      setResult({ kind: 'failed', message: t('errorWeak') })
      return
    }

    setBusy(kind)
    const { error } =
      kind === 'password'
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.updateUser({ email: nextEmail.trim() })
    setBusy(null)

    if (error) {
      setResult({ kind: 'failed', message: error.message })
      return
    }

    if (kind === 'password') {
      setPassword('')
      setResult({ kind: 'done', message: t('passwordSaved') })
    } else {
      // Supabase sends a confirmation to the new address, and the change only
      // takes effect once it is followed. Saying "saved" here would be a lie.
      setResult({ kind: 'done', message: t('emailPending', { email: nextEmail.trim() }) })
      setNextEmail('')
    }
  }

  async function endEverywhere(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    event.preventDefault()
    setBusy('sessions')
    // Revokes every refresh token this account has anywhere, then the form is
    // submitted so the server clears this browser's cookies too.
    await supabase.auth.signOut({ scope: 'global' })
    event.currentTarget.submit()
  }

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-bold">{t('securityTitle')}</h2>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor={passwordId}>
          {t(hasPassword ? 'changePassword' : 'setPassword')}
        </label>
        <p className="text-xs text-muted-foreground">
          {t(hasPassword ? 'changePasswordHint' : 'setPasswordHint', { provider: provider ?? '' })}
        </p>
        <input
          autoComplete="new-password"
          className={field}
          id={passwordId}
          minLength={MIN_PASSWORD_LENGTH}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('passwordPlaceholder', { count: MIN_PASSWORD_LENGTH })}
          type="password"
          value={password}
        />
        <button
          className={button}
          disabled={busy !== null || password.length === 0}
          onClick={() => void change('password')}
          type="button"
        >
          <KeyRound aria-hidden="true" className="size-4" />
          {t('savePassword')}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <label className="text-sm font-medium" htmlFor={emailId}>
          {t('changeEmail')}
        </label>
        <p className="text-xs text-muted-foreground">{t('changeEmailHint', { email: email ?? '—' })}</p>
        <input
          autoComplete="email"
          className={field}
          id={emailId}
          onChange={(event) => setNextEmail(event.target.value)}
          placeholder="ny@example.no"
          type="email"
          value={nextEmail}
        />
        <button
          className={button}
          disabled={busy !== null || !nextEmail.includes('@')}
          onClick={() => void change('email')}
          type="button"
        >
          <AtSign aria-hidden="true" className="size-4" />
          {t('saveEmail')}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <p className="text-sm font-medium">{t('signOutEverywhere')}</p>
        <p className="text-xs text-muted-foreground">{t('signOutEverywhereHint')}</p>
        <form action="/auth/sign-out" method="post" onSubmit={(event) => void endEverywhere(event)}>
          <input name="next" type="hidden" value={`/${locale}`} />
          <button className={button} disabled={busy !== null} type="submit">
            <LogOut aria-hidden="true" className="size-4" />
            {t('signOutEverywhereAction')}
          </button>
        </form>
      </div>

      {result.kind !== 'idle' ? (
        <p
          className={`text-sm ${result.kind === 'failed' ? 'text-destructive' : 'text-brand-strong'}`}
          role="status"
        >
          {result.message}
        </p>
      ) : null}
    </section>
  )
}
