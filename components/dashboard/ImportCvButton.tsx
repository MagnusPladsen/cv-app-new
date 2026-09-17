'use client'

import { FileUp, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { DialogPortal } from '@/components/ui/DialogPortal'
import { extractLines, IMPORT_ACCEPT, type ImportFailure } from '@/lib/import/extract'
import type { ParsedCv } from '@/lib/import/parse-cv'
import { ACCEPT_ALL, type ImportChoice } from '@/lib/import/to-document'

type Stage =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'failed'; reason: ImportFailure }
  | { kind: 'review'; parsed: ParsedCv }

const FAILURE_MESSAGE = {
  'no-text': 'scanned',
  unreadable: 'unreadable',
  'old-word': 'oldWord',
  unsupported: 'unsupported',
} as const satisfies Record<ImportFailure, string>

/**
 * Bringing in a CV written somewhere else.
 *
 * The file is read in this browser and nowhere else. Every other CV builder
 * that offers this uploads the file to a server to parse it; this one cannot,
 * which is worth saying on the button itself.
 *
 * Nothing is imported without being shown first. A parse of somebody's real CV
 * is a guess, and the review step is what turns a guess into a choice.
 */
export function ImportCvButton({
  onImport,
}: {
  onImport: (parsed: ParsedCv, choice: ImportChoice) => void
}) {
  const t = useTranslations('import')
  const inputId = useId()
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [choice, setChoice] = useState<ImportChoice>(ACCEPT_ALL)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setStage({ kind: 'reading' })
    setChoice(ACCEPT_ALL)

    // The parser is loaded here rather than at the top, and extractLines
    // loads the reader for the format it finds: pdf.js alone is about
    // 400 KiB, and nobody who never imports a CV should pay for it.
    const [{ parseCv }, extracted] = await Promise.all([
      import('@/lib/import/parse-cv'),
      file.arrayBuffer().then(extractLines),
    ])

    if (!extracted.ok) {
      setStage({ kind: 'failed', reason: extracted.reason })
      return
    }

    setStage({ kind: 'review', parsed: parseCv(extracted.lines) })
  }

  const counts = stage.kind === 'review' ? stage.parsed : null

  type Row = { key: keyof ImportChoice; label: string; found: number }
  const rows: Row[] = counts
    ? ([
        {
          key: 'personalia',
          label: t('personalia'),
          found: [
            counts.personalia.firstName,
            counts.personalia.email,
            counts.personalia.phone,
          ].filter(Boolean).length,
        },
        { key: 'summary', label: t('summary'), found: counts.summary ? 1 : 0 },
        { key: 'experience', label: t('experience'), found: counts.experience.length },
        { key: 'education', label: t('education'), found: counts.education.length },
        { key: 'skills', label: t('skills'), found: counts.skills.length },
        { key: 'languages', label: t('languages'), found: counts.languages.length },
        { key: 'interests', label: t('interests'), found: counts.interests.length },
        { key: 'unrecognised', label: t('unrecognised'), found: counts.unrecognised.length },
      ] satisfies Row[]).filter((row) => row.found > 0)
    : []

  return (
    <div className="flex flex-col gap-2">
      <label
        className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-within:ring-2 focus-within:ring-brand"
        htmlFor={inputId}
      >
        {stage.kind === 'reading' ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <FileUp aria-hidden="true" className="size-4" />
        )}
        {t('button')}
      </label>
      <input
        accept={IMPORT_ACCEPT}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          // Cleared so choosing the same file twice still fires a change.
          event.target.value = ''
        }}
        type="file"
      />
      <p className="text-xs text-muted-foreground">{t('local')}</p>

      {stage.kind === 'failed' ? (
        <p className="text-sm text-destructive" role="alert">
          {t(FAILURE_MESSAGE[stage.reason])}
        </p>
      ) : null}

      {stage.kind === 'review' ? (
        <DialogPortal>
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <button
              aria-hidden="true"
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setStage({ kind: 'idle' })}
              tabIndex={-1}
              type="button"
            />

            <div
              aria-labelledby="import-review-title"
              aria-modal="true"
              className="relative flex max-h-[85dvh] w-full flex-col gap-4 overflow-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:m-4 sm:max-w-lg sm:rounded-3xl"
              role="dialog"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold" id="import-review-title">
                  {t('reviewTitle')}
                </h2>
                <p className="text-sm text-muted-foreground">{t('reviewBody')}</p>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('nothingFound')}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {rows.map((row) => (
                    <li key={row.key}>
                      <label className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm">
                        <input
                          checked={choice[row.key]}
                          className="size-4 shrink-0 accent-brand"
                          onChange={(event) =>
                            setChoice((current) => ({
                              ...current,
                              [row.key]: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        <span className="flex-1">{row.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {row.found}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                  onClick={() => setStage({ kind: 'idle' })}
                  type="button"
                >
                  {t('cancel')}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50"
                  disabled={rows.length === 0}
                  onClick={() => {
                    onImport(stage.parsed, choice)
                    setStage({ kind: 'idle' })
                  }}
                  type="button"
                >
                  {t('create')}
                </button>
              </div>
            </div>
          </div>
        </DialogPortal>
      ) : null}
    </div>
  )
}
