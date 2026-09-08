'use client'

import { CheckCircle2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useSyncStatus } from '@/lib/sync/status'

/**
 * Confirms, after a first sign-in, that the CVs made anonymously actually came
 * along. The beta banner promises exactly this; without the notice the user
 * has to take it on faith.
 */
export function ClaimNotice() {
  const t = useTranslations('auth')
  const tBeta = useTranslations('beta')
  const claimedCount = useSyncStatus((state) => state.claimedCount)
  const clearClaimed = useSyncStatus((state) => state.clearClaimed)

  if (claimedCount === null) return null

  return (
    <section className="flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand-soft/50 p-4">
      <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
      <p className="flex-1 text-sm text-foreground/80">{t('claimed', { count: claimedCount })}</p>
      <button
        aria-label={tBeta('close')}
        className="rounded-full p-1 text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        onClick={clearClaimed}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </section>
  )
}
