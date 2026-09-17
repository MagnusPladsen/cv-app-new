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
import { CoverLetterForm } from './CoverLetterForm'
import { QualityPanel } from './QualityPanel'
import { SectionHelp } from './SectionHelp'
import { SectionList } from './SectionList'
import { SectionSettings } from './SectionSettings'

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

  // Reported by the preview, which is the only thing that knows how tall the
  // rendered document is.
  const [pages, setPages] = useState(1)

  const undo = useDocumentsTemporal((state) => state.undo)
  const redo = useDocumentsTemporal((state) => state.redo)
  const canUndo = useDocumentsTemporal((state) => state.pastStates.length > 0)
  const canRedo = useDocumentsTemporal((state) => state.futureStates.length > 0)

  // Scoped to the preview container: the template strip renders thumbnails
  // that are also .cv-doc nodes.
  // Every page in the preview, in order: the søknad prints before the CV, and
  // the export does not need to know which is which.
  const getNodes = () => [
    ...(previewRef.current?.querySelectorAll<HTMLElement>('.cv-doc') ?? []),
  ]

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
            {isDesktop ? <ExportButton document={document} getNodes={getNodes} /> : null}
          </div>

          <HistoryControls
            canRedo={canRedo}
            canUndo={canUndo}
            onRedo={() => redo()}
            onUndo={() => undo()}
          />
        </div>

        <DesignPanel
          document={document}
          onPaperChange={handlers.onPaperChange}
          onThemeChange={handlers.onThemeChange}
          paper={document.paper}
          theme={document.theme}
        />

        {/* The two places somebody is most likely to put something they should
            not: a national identity number, or a holiday photograph. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PhotoField
              onChange={(dataUrl) => handlers.onPersonaliaChange({ photo: { dataUrl } })}
              onRemove={() => handlers.onPersonaliaChange({ photo: undefined })}
              onToggle={(showPhoto) => handlers.onPersonaliaChange({ showPhoto })}
              photo={document.personalia.photo}
              showPhoto={document.personalia.showPhoto}
            />
          </div>
          <SectionHelp topic="photo" />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PersonaliaForm
              personalia={document.personalia}
              onChange={handlers.onPersonaliaChange}
            />
          </div>
          <SectionHelp topic="personalia" />
        </div>

        <SectionList
          activeSectionId={activeSectionId}
          labels={labels}
          onAddCustom={handlers.onAddCustomSection}
          onMove={handlers.onMoveSection}
          onRemove={handlers.onRemoveSection}
          onRename={handlers.onRenameSection}
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
          // Each section sits on its own card with room around it, so where
          // one ends and the next begins is obvious when they are all on
          // screen together.
          <div
            className="relative flex scroll-mt-24 flex-col gap-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-5"
            id={sectionFormId(section.id)}
            key={section.id}
          >
            {/* Pinned to the corner, level with the form's own heading. It
                used to sit in a row of its own above the form, which on every
                section but a custom one was a row holding nothing else - a
                band of empty space at the top of each card. */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <SectionHelp topic={section.type} />
            </div>

            {section.type === 'custom' ? (
              <div className="pr-9">
                <SectionSettings onShapeChange={handlers.onCustomShapeChange} section={section} />
              </div>
            ) : null}

            <SectionEditor handlers={handlers} labels={labels} section={section} />
          </div>
        ))}

        {enabledSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noSections')}</p>
        ) : null}

        {/* Last, because it is written about a finished CV and for one
            employer at a time. */}
        <CoverLetterForm
          letter={document.coverLetter}
          onChange={handlers.onCoverLetterChange}
        />

        {/* After the sections rather than before: it is a review of what you
            have written, and putting a list of faults above the fields would
            be scolding somebody for not having filled them in yet. */}
        <QualityPanel
          document={document}
          onSelectSection={onSelectSection}
          pages={pages}
        />


      </div>

      {/* Exactly one preview is mounted at a time - the export path clones
          the first .cv-doc it finds, so a second copy anywhere, hidden or
          not, would be a coin flip over which CV gets printed. */}
      {/* The preview sticks clear of the header rather than under it. The
          header is sticky and 57px tall, so holding the preview 24px from the
          top of the viewport slid its grey surround up against the navigation
          and the two appeared to merge. */}
      {isDesktop ? (
        <div className="min-w-0 lg:sticky lg:top-[5.25rem] lg:self-start">
          <PreviewPane
            containerRef={previewRef}
            document={document}
            onPagesChange={setPages}
          />
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
            <ExportButton document={document} getNodes={getNodes} />
          </div>

          {/* Mounted only while the sheet is shut, so there is still exactly
              one .cv-doc at any moment - and so that Last ned works without
              opening the preview first. It used to do nothing at all on a
              phone: the sheet returns null when closed, getNodes found no
              node, and the export returned silently. Hidden is enough,
              because the export clones markup rather than pixels. */}
          {!sheetOpen ? (
            <div className="hidden">
              <PreviewPane
                containerRef={previewRef}
                document={document}
                onPagesChange={setPages}
              />
            </div>
          ) : null}

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
