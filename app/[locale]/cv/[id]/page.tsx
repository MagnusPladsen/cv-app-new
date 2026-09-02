'use client'

import { useTranslations } from 'next-intl'
import { use } from 'react'
import { EditorSplit } from '@/components/editor/EditorSplit'
import { Link } from '@/i18n/navigation'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import type { Personalia, TimelineEntry } from '@/lib/schema/cv'
import { useDocuments } from '@/lib/store/documents'

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('editor')
  const hydrated = useHydrated()
  const document = useDocuments((state) => state.documents[id])
  const updateDocument = useDocuments((state) => state.updateDocument)

  const experienceSection = document?.sections.find((section) => section.type === 'experience')
  const experienceEntries =
    experienceSection && 'entries' in experienceSection ? experienceSection.entries : []

  function handlePersonaliaChange(patch: Partial<Personalia>) {
    updateDocument(id, (draft) => {
      Object.assign(draft.personalia, patch)
    })
  }

  function withExperience(recipe: (entries: TimelineEntry[]) => void) {
    updateDocument(id, (draft) => {
      const section = draft.sections.find((candidate) => candidate.type === 'experience')
      if (section && 'entries' in section && section.entries) recipe(section.entries)
    })
  }

  function handleAddEntry() {
    withExperience((entries) => {
      entries.push({
        id: crypto.randomUUID(),
        role: '',
        organisation: '',
        from: '',
        to: '',
        current: false,
        description: '',
        descriptionMode: 'bullets',
      })
    })
  }

  function handleUpdateEntry(entryId: string, patch: Partial<TimelineEntry>) {
    withExperience((entries) => {
      const entry = entries.find((candidate) => candidate.id === entryId)
      if (entry) Object.assign(entry, patch)
    })
  }

  function handleRemoveEntry(entryId: string) {
    withExperience((entries) => {
      const index = entries.findIndex((candidate) => candidate.id === entryId)
      if (index >= 0) entries.splice(index, 1)
    })
  }

  if (!hydrated) return null

  if (!document) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-neutral-600">{t('notFound')}</p>
        <Link className="underline" href="/cv">
          {t('backToList')}
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <EditorSplit
        document={document}
        experienceEntries={experienceEntries}
        onAddEntry={handleAddEntry}
        onPersonaliaChange={handlePersonaliaChange}
        onRemoveEntry={handleRemoveEntry}
        onUpdateEntry={handleUpdateEntry}
      />
    </main>
  )
}
