'use client'

import { useTranslations } from 'next-intl'
import { use } from 'react'
import { EditorSplit } from '@/components/editor/EditorSplit'
import { Link } from '@/i18n/navigation'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import type { Personalia } from '@/lib/schema/cv'
import { useDocuments } from '@/lib/store/documents'

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('editor')
  const hydrated = useHydrated()
  const document = useDocuments((state) => state.documents[id])
  const updateDocument = useDocuments((state) => state.updateDocument)

  function handlePersonaliaChange(patch: Partial<Personalia>) {
    updateDocument(id, (draft) => {
      Object.assign(draft.personalia, patch)
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
      <EditorSplit document={document} onPersonaliaChange={handlePersonaliaChange} />
    </main>
  )
}
