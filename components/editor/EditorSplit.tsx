'use client'

import { useRef } from 'react'

import { getCvLabels } from '@/lib/cv-labels'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { DesignPanel } from './DesignPanel'
import { ExportButton } from './ExportButton'
import { PersonaliaForm } from './PersonaliaForm'
import { PhotoField } from './PhotoField'
import { PreviewPane } from './PreviewPane'
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
  const previewRef = useRef<HTMLDivElement | null>(null)

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

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PreviewPane document={document} containerRef={previewRef} />
      </div>
    </div>
  )
}
