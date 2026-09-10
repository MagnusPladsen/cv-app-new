'use client'

import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useSessionUser } from '@/components/auth/SessionProvider'
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query'
import { buildPrintTitle } from '@/lib/print/build-print-html'
import { printCvNode } from '@/lib/print/print-cv'
import { templateStylesheet } from '@/lib/print/stylesheets'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { readFlag, writeFlag, type FlagStorage } from '@/lib/storage/flag'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { ExportFeedback } from './ExportFeedback'
import { ExportHint } from './ExportHint'
import { ExportSignInPrompt } from './ExportSignInPrompt'

export const EXPORT_HINT_KEY = 'cvapp:export-hint-seen:v1'
export const BETA_NOTICE_KEY = 'cvapp:beta-notice-seen:v1'
export const GUEST_EXPORT_KEY = 'cvapp:guest-export:v1'

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
  const user = useSessionUser()
  const [busy, setBusy] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

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

    // After the file, never before it: the notice must not stand between
    // someone and the download they came for.
    if (!readFlag(BETA_NOTICE_KEY, storage)) {
      writeFlag(BETA_NOTICE_KEY, storage)
      setFeedbackOpen(true)
    }
  }

  function proceed() {
    // On a phone the print path surfaces as the share sheet, so explain it once.
    if (!isDesktop && !readFlag(EXPORT_HINT_KEY, storage)) {
      setHintOpen(true)
      return
    }
    void runExport()
  }

  function handleClick() {
    // Only ask when signing in is actually on offer and would change
    // something. Gated on Supabase being configured rather than on an OAuth
    // provider existing: email and password is a sign-in path with no
    // provider behind it. Asking a signed-in user to sign in is nonsense.
    const askable = !user && isSupabaseConfigured() && !readFlag(GUEST_EXPORT_KEY, storage)
    if (askable) {
      setSignInOpen(true)
      return
    }
    proceed()
  }

  function handleGuest() {
    // Remembered, so the choice is asked once rather than nagged on every
    // download.
    writeFlag(GUEST_EXPORT_KEY, storage)
    setSignInOpen(false)
    proceed()
  }

  function handleContinue() {
    writeFlag(EXPORT_HINT_KEY, storage)
    setHintOpen(false)
    void runExport()
  }

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition duration-200 hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        disabled={busy}
        onClick={handleClick}
        type="button"
      >
        <Download aria-hidden="true" className="size-4" />
        {t('export')}
      </button>

      <ExportSignInPrompt
        next={typeof window === 'undefined' ? '/' : window.location.pathname}
        onCancel={() => setSignInOpen(false)}
        onGuest={handleGuest}
        open={signInOpen}
      />

      <ExportHint
        onCancel={() => setHintOpen(false)}
        onContinue={handleContinue}
        open={hintOpen}
      />

      <ExportFeedback onClose={() => setFeedbackOpen(false)} open={feedbackOpen} />
    </>
  )
}
