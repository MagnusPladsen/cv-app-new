'use client'

import { CloudUpload } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { useSessionUser } from '@/components/auth/SessionProvider'
import { SyncStatusBadge } from '@/components/auth/SyncStatusBadge'
import { Link } from '@/i18n/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/env'

/**
 * Says where this CV is stored, and offers the way to store it properly.
 *
 * Saving has always been automatic - every keystroke goes to localStorage,
 * and to the account when signed in - but nothing on the page said so, which
 * leaves a person wondering whether their work is safe. Silence is a poor
 * answer to "is this saved?".
 *
 * Signed out, the button carries the CV's own address as `next`, so signing
 * in returns here rather than to the dashboard. The work itself survives:
 * anonymous documents are claimed by the account on first sign-in.
 */
export function SaveState({ documentId }: { documentId: string }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const user = useSessionUser()

  if (user) return <SyncStatusBadge />

  // Nothing to offer without a backend; the dashboard badge already says the
  // CV is held on this device.
  if (!isSupabaseConfigured()) return <SyncStatusBadge />

  return (
    <Link
      className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/60 px-4 py-1.5 text-sm font-semibold text-brand-strong transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
      href={{ pathname: '/login', query: { next: `/${locale}/cv/${documentId}` } }}
      title={t('saveHintLocal')}
    >
      <CloudUpload aria-hidden="true" className="size-4" />
      {t('saveSignedOut')}
    </Link>
  )
}
