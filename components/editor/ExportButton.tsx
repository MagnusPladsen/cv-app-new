'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query'
import { buildPrintTitle } from '@/lib/print/build-print-html'
import { printCvNode } from '@/lib/print/print-cv'
import { templateStylesheet } from '@/lib/print/stylesheets'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { readFlag, writeFlag, type FlagStorage } from '@/lib/storage/flag'
import { ExportHint } from './ExportHint'

export const EXPORT_HINT_KEY = 'cvapp:export-hint-seen:v1'

export function ExportButton({
  document,
  getNode,
  print = printCvNode,
  storage,
}: {
  document: CvDocumentData
  getNode: () => HTMLElement | null
  print?: typeof printCvNode
  /** Injected in tests; defaults to localStorage. */
  storage?: FlagStorage
}) {
  const t = useTranslations('editor')
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [busy, setBusy] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)

  async function runExport() {
    const node = getNode()
    if (!node) return

    setBusy(true)
    try {
      await print({
        node,
        title: buildPrintTitle(document.personalia.firstName, document.personalia.lastName),
        paper: document.paper,
        lang: document.language,
        // Without this the exported PDF loses every template-specific rule,
        // while the on-screen preview still looks correct.
        extraStylesheets: [templateStylesheet(document.theme.templateId)],
      })
    } finally {
      setBusy(false)
    }
  }

  function handleClick() {
    // On a phone the print path surfaces as the share sheet, so explain it once.
    if (!isDesktop && !readFlag(EXPORT_HINT_KEY, storage)) {
      setHintOpen(true)
      return
    }
    void runExport()
  }

  function handleContinue() {
    writeFlag(EXPORT_HINT_KEY, storage)
    setHintOpen(false)
    void runExport()
  }

  return (
    <>
      <button
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-50"
        disabled={busy}
        onClick={handleClick}
        type="button"
      >
        {t('export')}
      </button>

      <ExportHint
        onCancel={() => setHintOpen(false)}
        onContinue={handleContinue}
        open={hintOpen}
      />
    </>
  )
}
