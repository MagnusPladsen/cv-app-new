'use client'

import { useTranslations } from 'next-intl'

import { TextField } from '@/components/editor/fields'
import type { ReferenceEntry } from '@/lib/schema/cv'
import { EntryListShell } from './EntryListShell'

export function ReferencesForm({
  sectionId,
  title,
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
}: {
  sectionId: string
  title: string
  entries: ReferenceEntry[]
  onAddEntry: (sectionId: string) => void
  onUpdateEntry: (sectionId: string, entryId: string, patch: Partial<ReferenceEntry>) => void
  onRemoveEntry: (sectionId: string, entryId: string) => void
}) {
  const t = useTranslations('reference')

  return (
    <EntryListShell
      entryIds={entries.map((entry) => entry.id)}
      // The empty state prints a line on the CV, which is otherwise invisible here.
      hint={t('onRequestHint')}
      onAddEntry={onAddEntry}
      onRemoveEntry={onRemoveEntry}
      renderEntry={(entryId) => {
        const entry = entries.find((candidate) => candidate.id === entryId)!
        const update = (patch: Partial<ReferenceEntry>) =>
          onUpdateEntry(sectionId, entryId, patch)

        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField label={t('name')} onChange={(name) => update({ name })} value={entry.name} />
            <TextField label={t('role')} onChange={(role) => update({ role })} value={entry.role} />
            <TextField
              label={t('organisation')}
              onChange={(organisation) => update({ organisation })}
              value={entry.organisation}
            />
            <TextField
              label={t('email')}
              onChange={(email) => update({ email })}
              type="email"
              value={entry.email}
            />
            <TextField
              label={t('phone')}
              onChange={(phone) => update({ phone })}
              type="tel"
              value={entry.phone}
            />
          </div>
        )
      }}
      sectionId={sectionId}
      title={title}
    />
  )
}
