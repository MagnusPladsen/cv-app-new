'use client'

import { useTranslations } from 'next-intl'

import { BackupControls } from '@/components/dashboard/BackupControls'
import { CvCard } from '@/components/dashboard/CvCard'
import { useRouter } from '@/i18n/navigation'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { backupFilename, parseBackup, serialiseDocument } from '@/lib/store/backup'
import { selectOrderedDocuments, useDocuments } from '@/lib/store/documents'

function downloadJson(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const hydrated = useHydrated()

  const documents = useDocuments(selectOrderedDocuments)
  const createDocument = useDocuments((state) => state.createDocument)
  const duplicateDocument = useDocuments((state) => state.duplicateDocument)
  const renameDocument = useDocuments((state) => state.renameDocument)
  const deleteDocument = useDocuments((state) => state.deleteDocument)
  const importDocument = useDocuments((state) => state.importDocument)

  function handleCreate() {
    router.push(`/cv/${createDocument({})}`)
  }

  function handleDuplicate(id: string) {
    const original = documents.find((document) => document.id === id)
    if (!original) return
    duplicateDocument(id, `${original.name || t('untitled')} (${t('copySuffix')})`)
  }

  function handleExport(id: string) {
    const document = documents.find((candidate) => candidate.id === id)
    if (!document) return
    downloadJson(backupFilename(document), serialiseDocument(document))
  }

  function handleImportText(text: string) {
    const parsed = parseBackup(text)
    if (!parsed.ok) return { ok: false }
    return { ok: importDocument(parsed.document).ok }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <button
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
          onClick={handleCreate}
          type="button"
        >
          {t('create')}
        </button>
      </div>

      {!hydrated ? null : (
        <>
          {documents.length === 0 ? (
            <p className="text-neutral-600">{t('empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {documents.map((document) => (
                <CvCard
                  document={document}
                  key={document.id}
                  onDelete={deleteDocument}
                  onDuplicate={handleDuplicate}
                  onExport={handleExport}
                  onOpen={(id) => router.push(`/cv/${id}`)}
                  onRename={renameDocument}
                />
              ))}
            </ul>
          )}

          <BackupControls onImportText={handleImportText} />
        </>
      )}
    </main>
  )
}
