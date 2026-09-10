'use client'

import { Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Asks Supabase to email a password-reset link.
 *
 * The confirmation is deliberately the same whether or not an account exists.
 * Saying "no account for that address" would turn this form into a way to
 * find out who has signed up.
 */
export function ResetRequestForm() {
  const t = useTranslations('auth')
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const supabase = getBrowserSupabase()
    if (!supabase) return

    setBusy(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/nytt-passord')}`,
    })
    setBusy(false)
    // Ignoring the error is the point: a failure here would otherwise reveal
    // whether the address is registered.
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft/50 p-6 text-center">
        <Mail aria-hidden="true" className="size-6 text-brand" />
        <p className="text-sm text-muted-foreground">{t('resetSent', { email: sentTo })}</p>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={emailId}>
          {t('emailLabel')}
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          id={emailId}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <button
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? t('working') : t('resetAction')}
      </button>
    </form>
  )
}
