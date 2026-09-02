'use client'

import { useTranslations } from 'next-intl'

import { TextField } from '@/components/editor/fields'
import type { CertEntry } from '@/lib/schema/cv'
import { EntryListShell } from './EntryListShell'

export function CertificationsForm({
  sectionId,
  title,
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
}: {
  sectionId: string
  title: string
  entries: CertEntry[]
  onAddEntry: (sectionId: string) => void
  onUpdateEntry: (sectionId: string, entryId: string, patch: Partial<CertEntry>) => void
  onRemoveEntry: (sectionId: string, entryId: string) => void
}) {
  const t = useTranslations('cert')

  return (
    <EntryListShell
      entryIds={entries.map((entry) => entry.id)}
      onAddEntry={onAddEntry}
      onRemoveEntry={onRemoveEntry}
      renderEntry={(entryId) => {
        const entry = entries.find((candidate) => candidate.id === entryId)!
        const update = (patch: Partial<CertEntry>) => onUpdateEntry(sectionId, entryId, patch)

        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField label={t('name')} onChange={(name) => update({ name })} value={entry.name} />
            <TextField
              label={t('issuer')}
              onChange={(issuer) => update({ issuer })}
              value={entry.issuer}
            />
            <TextField
              label={t('date')}
              onChange={(date) => update({ date })}
              type="month"
              value={entry.date}
            />
            <TextField
              label={t('url')}
              onChange={(url) => update({ url })}
              type="url"
              value={entry.url ?? ''}
            />
          </div>
        )
      }}
      sectionId={sectionId}
      title={title}
    />
  )
}
