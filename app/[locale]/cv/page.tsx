'use client'

import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { selectOrderedDocuments, useDocuments } from '@/lib/store/documents'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const hydrated = useHydrated()
  const documents = useDocuments(selectOrderedDocuments)
  const createDocument = useDocuments((state) => state.createDocument)

  function handleCreate() {
    router.push(`/cv/${createDocument({})}`)
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <button
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
          onClick={handleCreate}
          type="button"
        >
          {t('create')}
        </button>
      </div>

      {!hydrated ? null : documents.length === 0 ? (
        <p className="text-neutral-600">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.id}>
              <Link
                className="block rounded-2xl border border-neutral-200 px-5 py-4 transition hover:border-neutral-400"
                href={`/cv/${document.id}`}
              >
                {document.name || t('untitled')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
