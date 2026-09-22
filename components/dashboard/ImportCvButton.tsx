'use client'

import { FileUp, Loader2, ScanText } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { DialogPortal } from '@/components/ui/DialogPortal'
import { detectKind, extractLines, IMPORT_ACCEPT, type ImportFailure } from '@/lib/import/extract'
import type { ParsedCv } from '@/lib/import/parse-cv'
import { ACCEPT_ALL, type ImportChoice } from '@/lib/import/to-document'

type Stage =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'failed'; reason: ImportFailure | 'ocr' }
  /** A scan: no text to read, but an image the OCR could be pointed at. */
  | { kind: 'scanned'; file: File }
  | { kind: 'ocr'; percent: number }
  | { kind: 'review'; parsed: ParsedCv; fromImage?: boolean }

const FAILURE_MESSAGE = {
  ocr: 'ocrFailed',
  'no-text': 'scanned',
  unreadable: 'unreadable',
  'old-word': 'oldWord',
  unsupported: 'unsupported',
} as const satisfies Record<ImportFailure | 'ocr', string>

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
const PILL =
  'inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-within:ring-2 focus-within:ring-brand'

export function ImportCvButton({
  onImport,
  mode = 'new',
  label,
  showNote = true,
  triggerClassName = PILL,
}: {
  onImport: (parsed: ParsedCv, choice: ImportChoice) => void
  /** A new CV from the file, or the file added to the CV that is open. */
  mode?: 'new' | 'merge'
  label?: string
  /**
   * The "read on your machine" line under the button. Where there is no room
   * for it, it is shown in the review instead.
   */
  showNote?: boolean
  triggerClassName?: string
}) {
  const t = useTranslations('import')
  const locale = useLocale()
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
    const bytes = await file.arrayBuffer()
    // Read before extraction: pdf.js hands the buffer to its worker, which
    // detaches it, and a detached buffer cannot even be looked at.
    const kind = detectKind(new Uint8Array(bytes))
    const [{ parseCv }, extracted] = await Promise.all([
      import('@/lib/import/parse-cv'),
      extractLines(bytes),
    ])

    if (!extracted.ok) {
      // A scan is the one failure with a way forward, so it is offered
      // rather than reported: the OCR is 7 MB and a minute of somebody's
      // laptop, which is theirs to spend or not.
      // Only a PDF can be a scan worth pointing the OCR at. An empty Word
      // document reports the same reason and there is nothing to read.
      if (extracted.reason === 'no-text' && kind === 'pdf') setStage({ kind: 'scanned', file })
      else setStage({ kind: 'failed', reason: extracted.reason })
      return
    }

    setStage({ kind: 'review', parsed: parseCv(extracted.lines) })
  }

  async function readImage(file: File) {
    setStage({ kind: 'ocr', percent: 0 })
    const [{ parseCv }, { ocrPdf }] = await Promise.all([
      import('@/lib/import/parse-cv'),
      import('@/lib/import/ocr'),
    ])

    // Read again rather than kept: pdf.js hands the buffer to its worker,
    // which detaches it, and a detached buffer cannot be rendered.
    const result = await ocrPdf(await file.arrayBuffer(), ({ ratio }) =>
      setStage({ kind: 'ocr', percent: Math.round(ratio * 100) }),
    )
    if (!result.ok) {
      setStage({ kind: 'failed', reason: 'ocr' })
      return
    }
    setStage({ kind: 'review', parsed: parseCv(result.lines), fromImage: true })
  }

  const counts = stage.kind === 'review' ? stage.parsed : null

  type Row = { key: keyof ImportChoice; label: string; found: number }
  const allRows: Row[] = counts
    ? [
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
        { key: 'certifications', label: t('certifications'), found: counts.certifications.length },
        { key: 'courses', label: t('courses'), found: counts.courses.length },
        { key: 'projects', label: t('projects'), found: counts.projects.length },
        { key: 'volunteering', label: t('volunteering'), found: counts.volunteering.length },
        { key: 'references', label: t('references'), found: counts.references.length },
        {
          key: 'drivingLicence',
          label: t('drivingLicence'),
          found: counts.drivingLicence.length,
        },
        { key: 'interests', label: t('interests'), found: counts.interests.length },
        { key: 'unrecognised', label: t('unrecognised'), found: counts.unrecognised.length },
      ]
    : []
  const rows = allRows.filter((row) => row.found > 0)
  // Said out loud rather than left out, so an import that found the jobs but
  // not the education does not read as if the CV had none. Leftover lines are
  // not a section anyone expects, so their absence is not news.
  // Only the sections every CV is expected to have. Nobody reads "we did not
  // find your driving licence" as useful.
  const EXPECTED = ['personalia', 'summary', 'experience', 'education', 'skills', 'languages']
  const missing = allRows.filter((row) => row.found === 0 && EXPECTED.includes(row.key))

  return (
    <div className="flex flex-col gap-2">
      <label className={triggerClassName} htmlFor={inputId}>
        {stage.kind === 'reading' || stage.kind === 'ocr' ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <FileUp aria-hidden="true" className="size-4" />
        )}
        {label ?? t('button')}
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
      {showNote ? <p className="text-xs text-muted-foreground">{t('local')}</p> : null}

      {stage.kind === 'failed' ? (
        <p className="text-sm text-destructive" role="alert">
          {t(FAILURE_MESSAGE[stage.reason])}
        </p>
      ) : null}

      {stage.kind === 'scanned' ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-3">
          <p className="text-sm">{t('scanned')}</p>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            onClick={() => void readImage(stage.file)}
            type="button"
          >
            <ScanText aria-hidden="true" className="size-4" />
            {t('ocrStart')}
          </button>
          <p className="text-xs text-muted-foreground">{t('ocrNote')}</p>
        </div>
      ) : null}

      {stage.kind === 'ocr' ? (
        <p className="flex items-center gap-2 text-sm" role="status">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {t('ocrBusy', { percent: stage.percent })}
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
                <p className="text-sm text-muted-foreground">
                  {t(mode === 'merge' ? 'reviewBodyMerge' : 'reviewBody')}
                </p>
                {stage.fromImage ? (
                  <p className="text-sm text-amber-800">{t('ocrRough')}</p>
                ) : null}
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
                        <span className="flex flex-1 flex-col gap-0.5">
                          {row.label}
                          {row.key === 'unrecognised' ? (
                            <span className="text-xs text-muted-foreground">
                              {t('unrecognisedHint')}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {row.found}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              {showNote ? null : <p className="text-xs text-muted-foreground">{t('local')}</p>}

              {rows.length > 0 && missing.length > 0 ? (
                <p className="rounded-xl bg-brand-soft/60 px-3 py-2.5 text-sm text-foreground/80">
                  {t('missing', {
                    sections: new Intl.ListFormat(locale, { type: 'conjunction' }).format(
                      missing.map((row) => row.label.toLowerCase()),
                    ),
                  })}
                </p>
              ) : null}

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
                  {t(mode === 'merge' ? 'merge' : 'create')}
                </button>
              </div>
            </div>
          </div>
        </DialogPortal>
      ) : null}
    </div>
  )
}
