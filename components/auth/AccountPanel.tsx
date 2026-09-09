'use client'

import { Download, FileJson, LogOut, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { SyncStatusBadge } from '@/components/auth/SyncStatusBadge'
import type { SessionUserDto } from '@/lib/auth/dal'
import { STORAGE_PREFIX } from '@/lib/app-meta'
import { buildPrivacyExport, privacyExportFilename } from '@/lib/privacy/export'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { bundleFilename, serialiseBundle } from '@/lib/store/backup'
import { selectOrderedDocuments, useDocuments } from '@/lib/store/documents'

function downloadJson(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * The `cvapp:*` preference flags. The documents are exported separately and
 * in full, so they are excluded here rather than included twice.
 */
function readLocalSettings(): Record<string, string> {
  const settings: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX) && !key.startsWith(`${STORAGE_PREFIX}documents`)) {
        settings[key] = localStorage.getItem(key) ?? ''
      }
    }
  } catch {
    // Private browsing can refuse storage entirely. An export missing the
    // preference flags beats no export at all.
  }
  return settings
}

export function AccountPanel({ user }: { user: SessionUserDto }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const hydrated = useHydrated()
  const confirmId = useId()
  const [confirmation, setConfirmation] = useState('')

  const documents = useDocuments(useShallow(selectOrderedDocuments))
  const confirmWord = t('deleteConfirmWord')

  const buttonClass =
    'inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none'

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
        <p className="font-medium">{t('signedInAs', { email: user.email ?? '—' })}</p>
        {user.provider ? (
          <p className="text-sm text-muted-foreground">
            {t('signedInWith', { provider: user.provider })}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <SyncStatusBadge />
          {/* Rendered only after hydration: the count comes from localStorage,
              which the server cannot know, and guessing it flickers. */}
          {hydrated ? (
            <span className="text-sm text-muted-foreground">
              {t('cvCount', { count: documents.length })}
            </span>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <button
          className={buttonClass}
          disabled={!hydrated || documents.length === 0}
          onClick={() => downloadJson(bundleFilename(), serialiseBundle(documents))}
          type="button"
        >
          <Download aria-hidden="true" className="size-4" />
          {t('downloadAll')}
        </button>

        {/* Kept alongside the CV bundle rather than replacing it: the bundle
            is the Art. 20 portability format that imports back, this is the
            Art. 15 "everything you hold about me" answer. */}
        <div className="flex flex-col gap-1">
          <button
            className={buttonClass}
            disabled={!hydrated}
            onClick={() =>
              downloadJson(
                privacyExportFilename(),
                JSON.stringify(
                  buildPrivacyExport({
                    account: { id: user.id, email: user.email, provider: user.provider },
                    documents,
                    localSettings: readLocalSettings(),
                  }),
                  null,
                  2,
                ),
              )
            }
            type="button"
          >
            <FileJson aria-hidden="true" className="size-4" />
            {t('downloadEverything')}
          </button>
          <p className="text-xs text-muted-foreground">{t('downloadEverythingHint')}</p>
        </div>

        {/* A real form post, so signing out works without JavaScript and
            cannot be triggered by a GET. */}
        <form action="/auth/sign-out" method="post">
          <input name="next" type="hidden" value={`/${locale}`} />
          <button className={buttonClass} type="submit">
            <LogOut aria-hidden="true" className="size-4" />
            {t('signOut')}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm text-muted-foreground">{t('deleteWarning')}</p>
        <form action="/auth/delete-account" className="flex flex-col gap-3" method="post">
          <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={confirmId}>
            {t('deleteConfirm')}
            <input
              autoComplete="off"
              className="w-48 rounded-md border border-border bg-card px-3 py-1.5 font-normal focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              id={confirmId}
              onChange={(event) => setConfirmation(event.target.value)}
              type="text"
              value={confirmation}
            />
          </label>
          <button
            className="inline-flex w-fit items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={confirmation.trim() !== confirmWord}
            type="submit"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t('deleteAccount')}
          </button>
        </form>
      </section>
    </div>
  )
}
