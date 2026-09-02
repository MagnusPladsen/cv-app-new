'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { buildPrintTitle } from '@/lib/print/build-print-html'
import { printCvNode } from '@/lib/print/print-cv'
import { templateStylesheet } from '@/lib/print/stylesheets'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

export function ExportButton({
  document,
  getNode,
  print = printCvNode,
}: {
  document: CvDocumentData
  getNode: () => HTMLElement | null
  print?: typeof printCvNode
}) {
  const t = useTranslations('editor')
  const [busy, setBusy] = useState(false)

  async function handleClick() {
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

  return (
    <button
      className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
      disabled={busy}
      onClick={handleClick}
      type="button"
    >
      {t('export')}
    </button>
  )
}
