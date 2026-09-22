'use client'

import { Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import type { Template } from '@/components/cv/types'
import { ImportCvButton } from '@/components/dashboard/ImportCvButton'
import { DialogPortal } from '@/components/ui/DialogPortal'
import type { ParsedCv } from '@/lib/import/parse-cv'
import type { ImportChoice } from '@/lib/import/to-document'

const SECONDARY =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-within:ring-2 focus-within:ring-brand'

/**
 * What to do with the template somebody picked: start writing, or bring an
 * existing CV into it.
 *
 * Asked here rather than on the dashboard alone, because choosing a look is
 * the first thing a new visitor does - and the one moment they are most
 * likely to have an old CV they would rather not retype.
 */
export function TemplateStartDialog({
  template = null,
  onStart,
  onImport,
  onClose,
}: {
  /** The template picked, or null when somebody just said "get started". */
  template?: Template | null
  onStart: () => void
  onImport: (parsed: ParsedCv, choice: ImportChoice) => void
  onClose: () => void
}) {
  const t = useTranslations('gallery')
  const tImport = useTranslations('import')
  const startRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    startRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // The import review opens on top of this one and owns its own Escape.
      if (document.querySelectorAll('[role="dialog"]').length > 1) return
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <DialogPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button
          aria-hidden="true"
          className="absolute inset-0 bg-foreground/40"
          onClick={onClose}
          tabIndex={-1}
          type="button"
        />

        <div
          aria-labelledby="template-start-title"
          aria-modal="true"
          className="relative flex w-full flex-col gap-5 rounded-t-3xl bg-card p-5 shadow-2xl sm:m-4 sm:max-w-md sm:flex-row sm:rounded-3xl"
          role="dialog"
        >
          <button
            aria-label={t('close')}
            className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>

          {template ? (
            <div className="relative hidden aspect-[210/297] w-28 shrink-0 overflow-hidden rounded-lg ring-1 ring-border sm:block">
              <Image
                alt=""
                className="object-cover"
                fill
                quality={65}
                sizes="240px"
                src={`/templates/${template.id}.png`}
              />
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1 pr-8">
              <h2 className="text-lg font-bold" id="template-start-title">
                {template ? template.name : t('startTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(template ? 'chooseBody' : 'startBody')}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={onStart}
                ref={startRef}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                {t(template ? 'startNew' : 'startPick')}
              </button>
              <ImportCvButton
                label={tImport('buttonShort')}
                onImport={onImport}
                triggerClassName={SECONDARY}
              />
            </div>
          </div>
        </div>
      </div>
    </DialogPortal>
  )
}
