'use client'

import { Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { getCvLabels } from '@/lib/cv-labels'
import { useDocumentsTemporal } from '@/lib/store/documents'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { DesignPanel } from './DesignPanel'
import { ExportButton } from './ExportButton'
import { HistoryControls } from './HistoryControls'
import { PersonaliaForm } from './PersonaliaForm'
import { PhotoField } from './PhotoField'
import { PreviewPane } from './PreviewPane'
import { PreviewSheet } from './PreviewSheet'
import { SectionEditor } from './SectionEditor'
import { SectionList } from './SectionList'
import { SectionSettings } from './SectionSettings'
import { TemplateStrip } from './TemplateStrip'

export function EditorSplit({
  document,
  activeSectionId,
  onSelectSection,
  handlers,
}: {
  document: CvDocumentData
  activeSectionId: string | undefined
  onSelectSection: (sectionId: string) => void
  handlers: DocumentEditorHandlers
}) {
  const t = useTranslations('editor')
  const previewRef = useRef<HTMLDivElement | null>(null)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [sheetOpen, setSheetOpen] = useState(false)

  const undo = useDocumentsTemporal((state) => state.undo)
  const redo = useDocumentsTemporal((state) => state.redo)
  const canUndo = useDocumentsTemporal((state) => state.pastStates.length > 0)
  const canRedo = useDocumentsTemporal((state) => state.futureStates.length > 0)

  // Scoped to the preview container: the template strip renders thumbnails
  // that are also .cv-doc nodes.
  const getNode = () => previewRef.current?.querySelector<HTMLElement>('.cv-doc') ?? null

  const labels = getCvLabels(document.language)
  const activeSection = document.sections.find((section) => section.id === activeSectionId)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* min-w-0: a grid item defaults to min-width:auto, so the scrollable
          template strip would otherwise stretch the whole column past the screen. */}
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex items-center justify-between gap-3">
          <HistoryControls
            canRedo={canRedo}
            canUndo={canUndo}
            onRedo={() => redo()}
            onUndo={() => undo()}
          />
          <ExportButton document={document} getNode={getNode} />
        </div>

        <TemplateStrip
          document={document}
          onSelect={(templateId) => handlers.onThemeChange({ templateId })}
        />

        <SectionList
          activeSectionId={activeSectionId}
          labels={labels}
          onAddCustom={handlers.onAddCustomSection}
          onMove={handlers.onMoveSection}
          onRemove={handlers.onRemoveSection}
          onSelect={onSelectSection}
          onToggle={handlers.onToggleSection}
          sections={document.sections}
        />

        <PhotoField
          onChange={(dataUrl) => handlers.onPersonaliaChange({ photo: { dataUrl } })}
          onRemove={() => handlers.onPersonaliaChange({ photo: undefined })}
          onToggle={(showPhoto) => handlers.onPersonaliaChange({ showPhoto })}
          photo={document.personalia.photo}
          showPhoto={document.personalia.showPhoto}
        />

        <PersonaliaForm
          personalia={document.personalia}
          onChange={handlers.onPersonaliaChange}
        />

        {activeSection ? (
          <div className="flex flex-col gap-6">
            <SectionSettings
              labels={labels}
              onRename={handlers.onRenameSection}
              onShapeChange={handlers.onCustomShapeChange}
              section={activeSection}
            />
            <SectionEditor handlers={handlers} labels={labels} section={activeSection} />
          </div>
        ) : null}

        <DesignPanel
          onPaperChange={handlers.onPaperChange}
          onThemeChange={handlers.onThemeChange}
          paper={document.paper}
          theme={document.theme}
        />
      </div>

      {/* Exactly one preview is mounted at a time. A CSS-hidden second copy
          would still be in the DOM, and the export path clones the first
          .cv-doc it finds. */}
      {isDesktop ? (
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <PreviewPane containerRef={previewRef} document={document} />
        </div>
      ) : (
        <>
          <div className="h-16" />
          <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-brand hover:text-brand-strong"
              onClick={() => setSheetOpen(true)}
              type="button"
            >
              <Eye aria-hidden="true" className="size-4" />
              {t('preview')}
            </button>
            <ExportButton document={document} getNode={getNode} />
          </div>

          <PreviewSheet
            containerRef={previewRef}
            document={document}
            onOpenChange={setSheetOpen}
            open={sheetOpen}
          />
        </>
      )}
    </div>
  )
}
