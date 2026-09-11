'use client'

import { Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { seedSection } from '@/lib/editor/seed-section'
import { getCvLabels } from '@/lib/cv-labels'
import { useDocuments, useDocumentsTemporal } from '@/lib/store/documents'
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
import { SaveState } from './SaveState'
import { sectionFormId } from './section-form-id'
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

  // Opening a CV is the baseline. Without this the history still holds the
  // step that created the document, so the first Angre on a new CV deletes it
  // and the editor bounces to the dashboard - which reads as the button being
  // broken rather than as undo working.
  useEffect(() => {
    useDocuments.temporal.getState().clear()
  }, [document.id])

  // Only on a real choice. activeSectionId starts undefined while the store
  // hydrates and then settles on the first section, and treating that as a
  // selection scrolled the page on load - past the save and undo controls,
  // which is how they came to look missing.
  const previousSectionId = useRef<string | undefined>(undefined)
  useEffect(() => {
    const previous = previousSectionId.current
    previousSectionId.current = activeSectionId
    if (previous === undefined || previous === activeSectionId || !activeSectionId) return
    window.document
      .getElementById(sectionFormId(activeSectionId))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeSectionId])

  const undo = useDocumentsTemporal((state) => state.undo)
  const redo = useDocumentsTemporal((state) => state.redo)
  const canUndo = useDocumentsTemporal((state) => state.pastStates.length > 0)
  const canRedo = useDocumentsTemporal((state) => state.futureStates.length > 0)

  // Scoped to the preview container: the template strip renders thumbnails
  // that are also .cv-doc nodes.
  const getNode = () => previewRef.current?.querySelector<HTMLElement>('.cv-doc') ?? null

  const labels = getCvLabels(document.language)
  const enabledSections = document.sections.filter((section) => section.enabled)

  // A section switched on should have somewhere to write straight away, the
  // way Om meg does. Seeded once per section and only while it is empty, so
  // returning to a filled section never adds a stray blank row.
  const seeded = useRef(new Set<string>())
  useEffect(() => {
    for (const section of enabledSections) {
      if (seeded.current.has(section.id)) continue
      seeded.current.add(section.id)
      seedSection(section, handlers)
    }
  }, [enabledSections, handlers])


  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* min-w-0: a grid item defaults to min-width:auto, so the scrollable
          template strip would otherwise stretch the whole column past the screen. */}
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-3">
          {/* Two rows: what happens to the CV on top, how to step back below.
              Undo and redo are secondary to saving and downloading, and
              sharing a line with them read as one undifferentiated bar.

              The download is desktop only; on a phone it lives in the fixed
              bottom bar, and rendering both put two controls with the same
              accessible name on one screen. */}
          <div className="flex flex-wrap items-center gap-3">
            <SaveState documentId={document.id} />
            {isDesktop ? <ExportButton document={document} getNode={getNode} /> : null}
          </div>

          <HistoryControls
            canRedo={canRedo}
            canUndo={canUndo}
            onRedo={() => redo()}
            onUndo={() => undo()}
          />
        </div>

        <TemplateStrip
          document={document}
          onSelect={(templateId) => handlers.onThemeChange({ templateId })}
        />

        <DesignPanel
          onPaperChange={handlers.onPaperChange}
          onThemeChange={handlers.onThemeChange}
          paper={document.paper}
          theme={document.theme}
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



        {/* Every switched-on section, in the order it appears on the CV.
            Rendering only the selected one meant each new tick replaced the
            last: switch on Utdanning and it appears, switch on Arbeidserfaring
            and Utdanning vanishes - so the editor looked as though it could
            hold one section at a time. Clicking a row in the list now scrolls
            to that form rather than swapping which one exists. */}
        {enabledSections.map((section) => (
          <div
            className="flex scroll-mt-24 flex-col gap-6"
            id={sectionFormId(section.id)}
            key={section.id}
          >
            <SectionSettings
              labels={labels}
              onRename={handlers.onRenameSection}
              onShapeChange={handlers.onCustomShapeChange}
              section={section}
            />
            <SectionEditor handlers={handlers} labels={labels} section={section} />
          </div>
        ))}

        {enabledSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noSections')}</p>
        ) : null}

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
