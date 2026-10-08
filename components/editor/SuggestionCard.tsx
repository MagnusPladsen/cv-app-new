'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { applySuggestion, currentValue } from '@/lib/ai/apply'
import type { Suggestion } from '@/lib/ai/suggestions'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import type { CvDocument } from '@/lib/schema/cv'

/**
 * One suggestion, as a diff with a button under it.
 *
 * The old value above the new one, every time, because the press is meant to
 * be a change somebody read rather than a change the model made. Shared by the
 * chat and by the per-field buttons so there is one place where applying
 * happens, and one place where a vanished target is handled.
 */

export function SuggestionCard({
  document,
  handlers,
  suggestion,
}: {
  document: CvDocument
  handlers: DocumentEditorHandlers
  suggestion: Suggestion
}) {
  const t = useTranslations('assistant')
  const [applied, setApplied] = useState(false)
  const before = currentValue(document, suggestion)

  if (before === null) return <p className="text-xs text-muted-foreground">{t('gone')}</p>

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-3">
      {before.trim() ? (
        <div className="flex flex-col gap-0.5">
          <p className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
            {t('before')}
          </p>
          <p className="text-sm text-muted-foreground line-through decoration-muted-foreground/40">
            {before}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-0.5">
        <p className="text-[0.7rem] font-semibold tracking-wide text-brand-strong uppercase">
          {t('after')}
        </p>
        <p className="text-sm whitespace-pre-line text-foreground">{suggestion.value}</p>
      </div>

      {suggestion.why ? <p className="text-xs text-muted-foreground">{suggestion.why}</p> : null}

      <button
        className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/40 bg-brand-soft/60 px-3.5 py-1.5 text-xs font-semibold text-brand-strong transition hover:border-brand disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        disabled={applied}
        onClick={() => setApplied(applySuggestion(document, suggestion, handlers))}
        type="button"
      >
        {applied ? t('applied') : t('apply')}
      </button>
    </div>
  )
}
