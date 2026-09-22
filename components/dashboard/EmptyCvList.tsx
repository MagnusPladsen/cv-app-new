'use client'

import { FileText, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ImportCvButton } from '@/components/dashboard/ImportCvButton'
import type { ParsedCv } from '@/lib/import/parse-cv'
import type { ImportChoice } from '@/lib/import/to-document'

const SECONDARY =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-within:ring-2 focus-within:ring-brand'

/**
 * What somebody sees the first time they open the list.
 *
 * It used to be one grey sentence, which says nothing about the two ways in.
 * Both are offered here, in the same order as the landing page: start from a
 * template, or bring the CV you already have.
 */
export function EmptyCvList({
  onStart,
  onImport,
}: {
  onStart: () => void
  onImport: (parsed: ParsedCv, choice: ImportChoice) => void
}) {
  const t = useTranslations('dashboard')

  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/50 px-5 py-7 sm:px-7">
      <FileText aria-hidden="true" className="size-6 text-brand" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{t('emptyTitle')}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">{t('emptyBody')}</p>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          onClick={onStart}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('emptyStart')}
        </button>
        <ImportCvButton onImport={onImport} showNote={false} triggerClassName={SECONDARY} />
      </div>
    </div>
  )
}
