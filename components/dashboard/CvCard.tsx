'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

export function CvCard({
  document,
  onOpen,
  onDuplicate,
  onRename,
  onDelete,
  onExport,
}: {
  document: CvDocumentData
  onOpen: (id: string) => void
  onDuplicate: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
}) {
  const t = useTranslations('dashboard')
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [draftName, setDraftName] = useState(document.name)

  const displayName = document.name || t('untitled')
  const actionClass =
    'rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900'

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-neutral-200 px-5 py-4">
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
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm"
              onChange={(event) => setDraftName(event.target.value)}
              value={draftName}
            />
            <button className={actionClass} type="submit">
              {t('rename')}
            </button>
          </form>
        ) : (
          <button
            className="flex-1 text-left text-base font-semibold"
            onClick={() => onOpen(document.id)}
            type="button"
          >
            {displayName}
          </button>
        )}
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-3 py-2">
          <p className="flex-1 text-sm text-red-900">
            {t('confirmDelete', { name: displayName })}
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
            {t('rename')}
          </button>
          <button
            className={actionClass}
            onClick={() => onDuplicate(document.id)}
            type="button"
          >
            {t('duplicate')}
          </button>
          <button className={actionClass} onClick={() => onExport(document.id)} type="button">
            {t('export')}
          </button>
          <button className={actionClass} onClick={() => setConfirming(true)} type="button">
            {t('delete')}
          </button>
        </div>
      )}
    </li>
  )
}
