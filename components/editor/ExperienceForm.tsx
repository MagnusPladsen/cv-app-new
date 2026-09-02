'use client'

import { useTranslations } from 'next-intl'
import type { TimelineEntry } from '@/lib/schema/cv'

const inputClass =
  'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 disabled:bg-neutral-100 disabled:text-neutral-400'

export function ExperienceForm({
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
}: {
  entries: TimelineEntry[]
  onAddEntry: () => void
  onUpdateEntry: (entryId: string, patch: Partial<TimelineEntry>) => void
  onRemoveEntry: (entryId: string) => void
}) {
  const t = useTranslations('experience')

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {t('title')}
      </h2>

      {entries.map((entry) => (
        <fieldset
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4"
          key={entry.id}
        >
          <legend className="sr-only">{entry.role || t('title')}</legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">{t('role')}</span>
              <input
                className={inputClass}
                onChange={(event) => onUpdateEntry(entry.id, { role: event.target.value })}
                type="text"
                value={entry.role}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">{t('organisation')}</span>
              <input
                className={inputClass}
                onChange={(event) =>
                  onUpdateEntry(entry.id, { organisation: event.target.value })
                }
                type="text"
                value={entry.organisation}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">{t('location')}</span>
              <input
                className={inputClass}
                onChange={(event) => onUpdateEntry(entry.id, { location: event.target.value })}
                type="text"
                value={entry.location ?? ''}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-neutral-700">{t('from')}</span>
                <input
                  className={inputClass}
                  onChange={(event) => onUpdateEntry(entry.id, { from: event.target.value })}
                  type="month"
                  value={entry.from}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-neutral-700">{t('to')}</span>
                <input
                  className={inputClass}
                  disabled={entry.current}
                  onChange={(event) => onUpdateEntry(entry.id, { to: event.target.value })}
                  type="month"
                  value={entry.to}
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              checked={entry.current}
              onChange={(event) =>
                onUpdateEntry(entry.id, {
                  current: event.target.checked,
                  ...(event.target.checked ? { to: '' } : {}),
                })
              }
              type="checkbox"
            />
            {t('current')}
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-medium text-neutral-700">{t('description')}</span>
              <div className="flex gap-3 text-xs text-neutral-600">
                {(['bullets', 'prose'] as const).map((mode) => (
                  <label className="flex items-center gap-1.5" key={mode}>
                    <input
                      checked={entry.descriptionMode === mode}
                      name={`description-mode-${entry.id}`}
                      onChange={() => onUpdateEntry(entry.id, { descriptionMode: mode })}
                      type="radio"
                    />
                    {mode === 'bullets' ? t('modeBullets') : t('modeProse')}
                  </label>
                ))}
              </div>
            </div>
            <textarea
              className={inputClass}
              onChange={(event) => onUpdateEntry(entry.id, { description: event.target.value })}
              rows={4}
              value={entry.description ?? ''}
            />
            <p className="text-xs text-neutral-500">{t('descriptionHint')}</p>
          </div>

          <div className="flex justify-end">
            <button
              className="text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
              onClick={() => onRemoveEntry(entry.id)}
              type="button"
            >
              {t('remove')}
            </button>
          </div>
        </fieldset>
      ))}

      <div>
        <button
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:border-neutral-900"
          onClick={onAddEntry}
          type="button"
        >
          {t('add')}
        </button>
      </div>
    </section>
  )
}
