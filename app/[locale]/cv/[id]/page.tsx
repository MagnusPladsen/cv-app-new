'use client'

import { useTranslations } from 'next-intl'
import { use } from 'react'

import { EditorSplit } from '@/components/editor/EditorSplit'
import { Link } from '@/i18n/navigation'
import { useDocumentEditor } from '@/lib/hooks/use-document-editor'
import { useHydrated } from '@/lib/hooks/use-hydrated'

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('editor')
  const hydrated = useHydrated()
  const { document, activeSectionId, setActiveSectionId, handlers } = useDocumentEditor(id)

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
        activeSectionId={activeSectionId}
        document={document}
        handlers={handlers}
        onSelectSection={setActiveSectionId}
      />
    </main>
  )
}
