'use client'

import { LogIn, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useSessionUser } from '@/components/auth/SessionProvider'
import { Link } from '@/i18n/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export function AccountMenu() {
  const t = useTranslations('auth')
  const user = useSessionUser()

  // Nothing to offer when auth is switched off; the header stays as it is
  // today rather than growing a link that cannot work.
  if (!isSupabaseConfigured()) return null

  const className =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-brand-soft hover:text-brand-strong'

  // On phones the label is dropped and carried by aria-label instead: the
  // header row cannot fit it, and an unlabelled icon with no accessible name
  // would be worse than either.
  if (!user) {
    return (
      <Link aria-label={t('signIn')} className={className} href="/login">
        <LogIn aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">{t('signIn')}</span>
      </Link>
    )
  }

  return (
    <Link aria-label={t('account')} className={className} href="/account">
      <UserRound aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{user.email ?? t('account')}</span>
    </Link>
  )
}
