import { getTranslations } from 'next-intl/server'

import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { SignInButtons } from '@/components/auth/SignInButtons'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string; confirmed?: string }>
}) {
  const { locale } = await params
  const { next, confirmed } = await searchParams
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16 sm:py-24">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('signInTitle')}</h1>
        <p className="text-muted-foreground">{t('signInLead')}</p>
      </div>
      {/* A deployment without the Supabase keys has no way to sign anyone
          in. Saying so beats a form that accepts a password and then does
          nothing at all, which is what it did. */}
      {confirmed ? (
        <p
          className="rounded-xl border border-brand/30 bg-brand-soft/60 p-4 text-center text-sm text-brand-strong"
          role="status"
        >
          {t('confirmed')}
        </p>
      ) : null}

      {isSupabaseConfigured() ? (
        <>
          <EmailAuthForm next={next ?? `/${locale}/cv`} />

          {/* Only rendered when a provider is actually configured. Email and
              password is the way in; OAuth is additive. */}
          <SignInButtons next={next ?? `/${locale}/cv`} />
        </>
      ) : (
        <p
          className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground"
          role="status"
        >
          {t('unavailable')}
        </p>
      )}
    </main>
  )
}
