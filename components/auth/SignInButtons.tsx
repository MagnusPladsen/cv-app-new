'use client'

import { LogIn } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { PROVIDER_LABELS } from '@/lib/auth/providers'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { enabledProviders, type OAuthProvider } from '@/lib/supabase/env'

export function SignInButtons({ next = '/' }: { next?: string }) {
  const t = useTranslations('auth')
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const providers = enabledProviders()

  if (providers.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('unavailable')}</p>
  }

  async function signIn(provider: OAuthProvider) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    setPending(provider)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
    // On success the browser has already left for the provider; only a
    // failure ever gets here.
    if (error) setPending(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          disabled={pending !== null}
          key={provider}
          onClick={() => void signIn(provider)}
          type="button"
        >
          <LogIn aria-hidden="true" className="size-4" />
          {t('continueWith', { provider: PROVIDER_LABELS[provider] })}
        </button>
      ))}
    </div>
  )
}
