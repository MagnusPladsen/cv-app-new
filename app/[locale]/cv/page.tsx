'use client'

import { Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { ClaimNotice } from '@/components/auth/ClaimNotice'
import { SyncStatusBadge } from '@/components/auth/SyncStatusBadge'
import { BackupControls } from '@/components/dashboard/BackupControls'
import { EmptyCvList } from '@/components/dashboard/EmptyCvList'
import { ImportCvButton } from '@/components/dashboard/ImportCvButton'
import { CvCard } from '@/components/dashboard/CvCard'
import { useRouter } from '@/i18n/navigation'
import { cvDisplayName } from '@/lib/cv-name'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { backupFilename, parseBackup, serialiseDocument } from '@/lib/store/backup'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

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
  const locale = useLocale()
  const router = useRouter()
  const hydrated = useHydrated()
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<'edited' | 'name'>('edited')

  // useShallow keeps the reference stable across renders. selectOrderedDocuments
  // builds a new array each call, and zustand v5 reads through
  // useSyncExternalStore, so an unstable reference is an infinite render loop.
  const documents = useDocuments(useShallow(selectOrderedDocuments))
  const duplicateDocument = useDocuments((state) => state.duplicateDocument)
  const renameDocument = useDocuments((state) => state.renameDocument)
  const deleteDocument = useDocuments((state) => state.deleteDocument)
  const importDocument = useDocuments((state) => state.importDocument)

  // Sorting and searching only appear once a list is long enough to need
  // them; below that they are two controls in the way of four CVs.
  const SEARCHABLE_FROM = 5
  const shown = documents
    .filter((document) =>
      query.trim() === ''
        ? true
        : cvDisplayName(document, locale).toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      order === 'name'
        ? cvDisplayName(a, locale).localeCompare(cvDisplayName(b, locale), locale)
        : b.updatedAt - a.updatedAt,
    )

  // Template first: choosing a look is step one, then the editor.
  function handleCreate() {
    router.push('/templates')
  }

  function handleDuplicate(id: string) {
    const original = documents.find((document) => document.id === id)
    if (!original) return
    duplicateDocument(id, `${cvDisplayName(original, locale)} (${t('copySuffix')})`)
  }

  function handleExport(id: string) {
    const document = documents.find((candidate) => candidate.id === id)
    if (!document) return
    downloadJson(backupFilename(document), serialiseDocument(document))
  }

  async function handleImportParsed(
    parsed: import('@/lib/import/parse-cv').ParsedCv,
    choice: import('@/lib/import/to-document').ImportChoice,
  ) {
    // Built here and handed to importDocument, which is the same validated
    // path a backup file takes: a fresh id, and a schema check before
    // anything reaches the store.
    const { documentFromParse } = await import('@/lib/import/to-document')
    const result = importDocument(documentFromParse(parsed, choice))
    if (result.ok) router.push(`/cv/${result.id}`)
  }

  function handleImportText(text: string) {
    const parsed = parseBackup(text)
    if (!parsed.ok) return { ok: false }
    // A file can hold one CV or a whole account; both arrive as a list.
    const results = parsed.documents.map((document) => importDocument(document))
    return { ok: results.some((result) => result.ok) }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <SyncStatusBadge />
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={handleCreate}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('create')}
        </button>
      </div>

      <ClaimNotice />

      {!hydrated ? null : (
        <>
          {documents.length >= SEARCHABLE_FROM ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label={t('search')}
                className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('search')}
                type="search"
                value={query}
              />
              <div className="flex items-center gap-1" role="group">
                {(['edited', 'name'] as const).map((option) => (
                  <button
                    aria-pressed={order === option}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      order === option
                        ? 'bg-brand text-brand-ink'
                        : 'text-muted-foreground hover:bg-brand-soft hover:text-brand-strong'
                    }`}
                    key={option}
                    onClick={() => setOrder(option)}
                    type="button"
                  >
                    {t(option === 'edited' ? 'sortEdited' : 'sortName')}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {documents.length === 0 ? (
            <EmptyCvList onImport={handleImportParsed} onStart={handleCreate} />
          ) : shown.length === 0 ? (
            <p className="text-muted-foreground">{t('noMatches', { query })}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map((document) => (
                <CvCard
                  document={document}
                  key={document.id}
                  onDelete={deleteDocument}
                  onDownloadPdf={(id) => router.push(`/cv/${id}?print=1`)}
                  onDuplicate={handleDuplicate}
                  onExport={handleExport}
                  onOpen={(id) => router.push(`/cv/${id}`)}
                  onRename={renameDocument}
                />
              ))}
            </ul>
          )}

          {documents.length > 0 ? (
            <div className="flex flex-wrap items-start gap-4">
              <ImportCvButton onImport={handleImportParsed} />
              <BackupControls onImportText={handleImportText} />
            </div>
          ) : null}
        </>
      )}
    </main>
  )
}
