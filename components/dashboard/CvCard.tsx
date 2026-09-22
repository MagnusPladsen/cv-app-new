'use client'

import { Copy, Download, FileDown, Pencil, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { useSessionUser } from '@/components/auth/SessionProvider'
import { CvThumb } from '@/components/dashboard/CvThumb'
import { cvDisplayName } from '@/lib/cv-name'
import { checkDocument } from '@/lib/quality/checks'
import { sinceWords } from '@/lib/since'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

export function CvCard({
  document,
  onOpen,
  onDuplicate,
  onRename,
  onDelete,
  onExport,
  onDownloadPdf,
}: {
  document: CvDocumentData
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
  /** Opens the CV and starts its download, without a detour via the editor. */
  onDownloadPdf: (id: string) => void
}) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  // What deleting actually does depends on where the CV lives: one browser,
  // or an account that every device reads. Saying the wrong one is worse
  // than saying neither - this is the last warning before it is gone.
  const signedIn = useSessionUser() !== null
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [draftName, setDraftName] = useState(document.name)

  // Never "Uten navn": an unnamed CV is named after whoever it is for and the
  // day it was made, which is what tells two of them apart in a list.
  const displayName = cvDisplayName(document, locale)

  // Pages are measured by the preview, which is not on this page, so the
  // length check is left out rather than guessed at. Everything else - a
  // missing name, a job with no dates - is worth saying here.
  const findings = checkDocument(document, { pages: 1 })
  const toFix = findings.filter((finding) => finding.severity !== 'info').length
  const edited = sinceWords(document.updatedAt, locale)
  const actionClass =
    'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition duration-150 hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none'

  return (
    <li className="flex gap-4 rounded-2xl border border-border px-4 py-4 sm:px-5">
      <button
        aria-label={`${t('open')} ${displayName}`}
        className="shrink-0 rounded-md transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        onClick={() => onOpen(document.id)}
        type="button"
      >
        <CvThumb document={document} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {renaming ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              onRename(document.id, draftName)
              setRenaming(false)
            }}
          >
            <input
              aria-label={t('renamePrompt')}
              autoFocus
              className="flex-1 rounded-xl border border-border px-3 py-1.5 text-sm"
              onChange={(event) => setDraftName(event.target.value)}
              value={draftName}
            />
            <button className={actionClass} type="submit">
              {t('rename')}
            </button>
          </form>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <button
              className="text-left text-base font-semibold"
              onClick={() => onOpen(document.id)}
              type="button"
            >
              {displayName}
            </button>
            {/* What the list is for: which of these is finished, and which
                one did I touch last. */}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{t('editedAgo', { since: edited })}</span>
              <span aria-hidden="true">·</span>
              <span className={toFix > 0 ? 'font-semibold text-amber-700' : 'text-brand-strong'}>
                {toFix > 0 ? t('toFix', { count: toFix }) : t('looksGood')}
              </span>
            </p>
          </div>
        )}
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-3 py-2">
          <p className="flex-1 text-sm text-red-900">
            {t(signedIn ? 'confirmDeleteAccount' : 'confirmDelete', { name: displayName })}
          </p>
          <button
            className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white"
            onClick={() => onDelete(document.id)}
            type="button"
          >
            {t('confirm')}
          </button>
          <button className={actionClass} onClick={() => setConfirming(false)} type="button">
            {t('cancel')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          <button className={actionClass} onClick={() => setRenaming(true)} type="button">
            <Pencil aria-hidden="true" className="size-3.5" />
            {t('rename')}
          </button>
          <button
            className={actionClass}
            onClick={() => onDuplicate(document.id)}
            type="button"
          >
            <Copy aria-hidden="true" className="size-3.5" />
            {t('duplicate')}
          </button>
          <button
            className={actionClass}
            onClick={() => onDownloadPdf(document.id)}
            type="button"
          >
            <FileDown aria-hidden="true" className="size-3.5" />
            {t('downloadPdf')}
          </button>
          <button className={actionClass} onClick={() => onExport(document.id)} type="button">
            <Download aria-hidden="true" className="size-3.5" />
            {t('export')}
          </button>
          <button className={actionClass} onClick={() => setConfirming(true)} type="button">
            <Trash2 aria-hidden="true" className="size-3.5" />
            {t('delete')}
          </button>
        </div>
      )}
      </div>
    </li>
  )
}
