'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

/** Shared card list chrome for the entry forms that do not need reordering. */
export function EntryListShell({
  title,
  hint,
  notice,
  entryIds,
  sectionId,
  onAddEntry,
  onRemoveEntry,
  renderEntry,
}: {
  title: string
  hint?: string
  /**
   * A privacy obligation, styled apart from `hint`. The references section
   * uses it to say the user needs their referee's permission, and burying
   * that inside a formatting tip would be the wrong emphasis.
   */
  notice?: string
  entryIds: string[]
  sectionId: string
  onAddEntry: (sectionId: string) => void
  onRemoveEntry: (sectionId: string, entryId: string) => void
  renderEntry: (entryId: string) => ReactNode
}) {
  const t = useTranslations('items')

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {notice ? (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-foreground/80">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {entryIds.map((entryId) => (
          <fieldset
            className="flex flex-col gap-3 rounded-2xl border border-border p-4"
            key={entryId}
          >
            <legend className="sr-only">{title}</legend>
            {renderEntry(entryId)}
            <div className="flex justify-end">
              <button
                className="rounded text-sm font-medium text-muted-foreground underline-offset-2 transition hover:text-brand-strong hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                onClick={() => onRemoveEntry(sectionId, entryId)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                {t('remove')}
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      <div>
        <button
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          onClick={() => onAddEntry(sectionId)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('add')}
        </button>
      </div>
    </section>
  )
}
