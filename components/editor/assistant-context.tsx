'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import type { CvDocument } from '@/lib/schema/cv'

/**
 * What an "Ask AI" button needs, without threading it through six forms.
 *
 * The document to scrub against, the page count the preview measured, and the
 * handlers an applied suggestion writes through. Provided once by EditorSplit.
 *
 * A form rendered without the provider gets null and renders no button, which
 * is what keeps the forms testable on their own - and what makes the feature
 * absent rather than broken anywhere it has not been wired up.
 */

type AssistantContextValue = {
  document: CvDocument
  pages: number
  handlers: DocumentEditorHandlers
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function AssistantProvider({
  children,
  document,
  handlers,
  pages,
}: AssistantContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ document, pages, handlers }),
    [document, pages, handlers],
  )
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export function useAssistant(): AssistantContextValue | null {
  return useContext(AssistantContext)
}
