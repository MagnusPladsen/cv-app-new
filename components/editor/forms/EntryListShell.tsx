'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

/** Shared card list chrome for the entry forms that do not need reordering. */
export function EntryListShell({
  title,
  hint,
  entryIds,
  sectionId,
  onAddEntry,
  onRemoveEntry,
  renderEntry,
}: {
  title: string
  hint?: string
  entryIds: string[]
  sectionId: string
  onAddEntry: (sectionId: string) => void
  onRemoveEntry: (sectionId: string, entryId: string) => void
  renderEntry: (entryId: string) => ReactNode
}) {
  const t = useTranslations('items')

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">{title}</h2>
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}

      <div className="flex flex-col gap-4">
        {entryIds.map((entryId) => (
          <fieldset
            className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4"
            key={entryId}
          >
            <legend className="sr-only">{title}</legend>
            {renderEntry(entryId)}
            <div className="flex justify-end">
              <button
                className="text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
                onClick={() => onRemoveEntry(sectionId, entryId)}
                type="button"
              >
                {t('remove')}
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      <div>
        <button
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:border-neutral-900"
          onClick={() => onAddEntry(sectionId)}
          type="button"
        >
          {t('add')}
        </button>
      </div>
    </section>
  )
}
