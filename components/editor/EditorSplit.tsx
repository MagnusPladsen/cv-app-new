'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { getCvLabels } from '@/lib/cv-labels'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { DesignPanel } from './DesignPanel'
import { ExportButton } from './ExportButton'
import { PersonaliaForm } from './PersonaliaForm'
import { PhotoField } from './PhotoField'
import { PreviewPane } from './PreviewPane'
import { PreviewSheet } from './PreviewSheet'
import { SectionEditor } from './SectionEditor'
import { SectionList } from './SectionList'

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

  const getNode = () => previewRef.current?.querySelector<HTMLElement>('.cv-doc') ?? null

  const labels = getCvLabels(document.language)
  const activeSection = document.sections.find((section) => section.id === activeSectionId)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-8">
        <div className="flex justify-end">
          <ExportButton document={document} getNode={getNode} />
        </div>

        <DesignPanel
          onPaperChange={handlers.onPaperChange}
          onThemeChange={handlers.onThemeChange}
          paper={document.paper}
          theme={document.theme}
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
          <SectionEditor handlers={handlers} labels={labels} section={activeSection} />
        ) : null}
      </div>

      {/* Exactly one preview is mounted at a time. A CSS-hidden second copy
          would still be in the DOM, and the export path clones the first
          .cv-doc it finds. */}
      {isDesktop ? (
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PreviewPane containerRef={previewRef} document={document} />
        </div>
      ) : (
        <>
          <div className="h-16" />
          <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
            <button
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold"
              onClick={() => setSheetOpen(true)}
              type="button"
            >
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
