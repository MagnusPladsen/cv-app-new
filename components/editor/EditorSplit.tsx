'use client'

import { useRef } from 'react'
import type { CvDocument as CvDocumentData, Personalia } from '@/lib/schema/cv'
import { ExportButton } from './ExportButton'
import { PersonaliaForm } from './PersonaliaForm'
import { PreviewPane } from './PreviewPane'

export function EditorSplit({
  document,
  onPersonaliaChange,
}: {
  document: CvDocumentData
  onPersonaliaChange: (patch: Partial<Personalia>) => void
}) {
  const previewRef = useRef<HTMLDivElement | null>(null)

  const getNode = () => previewRef.current?.querySelector<HTMLElement>('.cv-doc') ?? null

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <ExportButton document={document} getNode={getNode} />
        </div>
        <PersonaliaForm personalia={document.personalia} onChange={onPersonaliaChange} />
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <PreviewPane document={document} containerRef={previewRef} />
      </div>
    </div>
  )
}
