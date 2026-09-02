'use client'

import { useCallback, useMemo, useState } from 'react'
import { useStore } from 'zustand'

import type { SectionEditorHandlers } from '@/components/editor/SectionEditor'
import type {
  CertEntry,
  CvDocument,
  CvTheme,
  LanguageItem,
  PaperId,
  Personalia,
  ReferenceEntry,
  SkillItem,
  TimelineEntry,
} from '@/lib/schema/cv'
import * as actions from '@/lib/store/document-actions'
import { useDocuments, type DocumentsStoreApi } from '@/lib/store/documents'

export type DocumentEditorHandlers = SectionEditorHandlers & {
  onPersonaliaChange: (patch: Partial<Personalia>) => void
  onToggleSection: (sectionId: string, enabled: boolean) => void
  onRenameSection: (sectionId: string, title: string) => void
  onMoveSection: (from: number, to: number) => void
  onAddCustomSection: () => void
  onRemoveSection: (sectionId: string) => void
  onThemeChange: (patch: Partial<CvTheme>) => void
  onPaperChange: (paper: PaperId) => void
}

export type DocumentEditor = {
  document: CvDocument | undefined
  activeSectionId: string | undefined
  setActiveSectionId: (sectionId: string) => void
  handlers: DocumentEditorHandlers
}

const newId = () => crypto.randomUUID()

/**
 * The single place that knows about the store. Every editor component stays
 * presentational, taking data and callbacks as props.
 */
export function useDocumentEditor(
  documentId: string,
  store: DocumentsStoreApi = useDocuments,
): DocumentEditor {
  const document = useStore(store, (state) => state.documents[documentId])
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(undefined)

  const edit = useCallback(
    (recipe: (draft: CvDocument) => void) =>
      store.getState().updateDocument(documentId, recipe),
    [documentId, store],
  )

  // Falls back to the first section so the editor always has something open,
  // and recovers automatically if the selected section is removed.
  const activeSectionId =
    selectedSectionId && document?.sections.some((section) => section.id === selectedSectionId)
      ? selectedSectionId
      : document?.sections[0]?.id

  const handlers = useMemo<DocumentEditorHandlers>(
    () => ({
      onPersonaliaChange: (patch: Partial<Personalia>) =>
        edit((draft) => void Object.assign(draft.personalia, patch)),

      onToggleSection: (sectionId, enabled) =>
        edit((draft) => actions.setSectionEnabled(draft, sectionId, enabled)),

      onRenameSection: (sectionId, title) =>
        edit((draft) => actions.setSectionTitle(draft, sectionId, title)),

      onMoveSection: (from, to) => edit((draft) => actions.moveSection(draft, from, to)),

      onAddCustomSection: () => {
        let created: string | undefined
        edit((draft) => {
          created = actions.addCustomSection(draft, 'bullets', newId)
        })
        if (created) setSelectedSectionId(created)
      },

      onRemoveSection: (sectionId) => edit((draft) => actions.removeSection(draft, sectionId)),

      onSummaryChange: (sectionId, text) =>
        edit((draft) => actions.setSummaryText(draft, sectionId, text)),

      onStringListChange: (sectionId, values) =>
        edit((draft) => actions.setStringList(draft, sectionId, values)),

      onCustomTextChange: (sectionId, text) =>
        edit((draft) => actions.setCustomText(draft, sectionId, text)),

      onAddEntry: (sectionId) =>
        edit((draft) => void actions.addTimelineEntry(draft, sectionId, newId)),

      onUpdateEntry: (sectionId, entryId, patch: Partial<TimelineEntry>) =>
        edit((draft) => actions.updateTimelineEntry(draft, sectionId, entryId, patch)),

      onRemoveEntry: (sectionId, entryId) =>
        edit((draft) => actions.removeEntry(draft, sectionId, entryId)),

      onMoveEntry: (sectionId, from, to) =>
        edit((draft) => actions.moveEntry(draft, sectionId, from, to)),

      onAddItem: (sectionId) =>
        edit((draft) => void actions.addLeveledItem(draft, sectionId, newId)),

      onUpdateItem: (
        sectionId,
        itemId,
        patch: Partial<SkillItem> | Partial<LanguageItem>,
      ) => edit((draft) => actions.updateLeveledItem(draft, sectionId, itemId, patch)),

      onRemoveItem: (sectionId, itemId) =>
        edit((draft) => actions.removeItem(draft, sectionId, itemId)),

      onAddCert: (sectionId) =>
        edit((draft) => void actions.addCertEntry(draft, sectionId, newId)),

      onUpdateCert: (sectionId, entryId, patch: Partial<CertEntry>) =>
        edit((draft) => actions.updateCertEntry(draft, sectionId, entryId, patch)),

      onAddReference: (sectionId) =>
        edit((draft) => void actions.addReferenceEntry(draft, sectionId, newId)),

      onUpdateReference: (sectionId, entryId, patch: Partial<ReferenceEntry>) =>
        edit((draft) => actions.updateReferenceEntry(draft, sectionId, entryId, patch)),

      onThemeChange: (patch: Partial<CvTheme>) =>
        edit((draft) => void Object.assign(draft.theme, patch)),

      onPaperChange: (paper) => edit((draft) => void (draft.paper = paper)),
    }),
    [edit],
  )

  return { document, activeSectionId, setActiveSectionId: setSelectedSectionId, handlers }
}
