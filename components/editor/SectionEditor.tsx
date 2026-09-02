'use client'

import { sectionTitle } from '@/components/cv/sections'
import type { CvLabels } from '@/lib/cv-labels'
import type {
  CertEntry,
  LanguageItem,
  ReferenceEntry,
  Section,
  SkillItem,
  TimelineEntry,
} from '@/lib/schema/cv'
import { CertificationsForm } from './forms/CertificationsForm'
import { CustomTextForm } from './forms/CustomTextForm'
import { StringListForm } from './forms/StringListForm'
import { LeveledItemsForm } from './forms/LeveledItemsForm'
import { ReferencesForm } from './forms/ReferencesForm'
import { SummaryForm } from './forms/SummaryForm'
import { TimelineForm } from './forms/TimelineForm'

export type SectionEditorHandlers = {
  onSummaryChange: (sectionId: string, text: string) => void
  onStringListChange: (sectionId: string, values: string[]) => void
  onCustomTextChange: (sectionId: string, text: string) => void
  onAddEntry: (sectionId: string) => void
  onUpdateEntry: (sectionId: string, entryId: string, patch: Partial<TimelineEntry>) => void
  onRemoveEntry: (sectionId: string, entryId: string) => void
  onMoveEntry: (sectionId: string, from: number, to: number) => void
  onAddItem: (sectionId: string) => void
  onUpdateItem: (
    sectionId: string,
    itemId: string,
    patch: Partial<SkillItem> | Partial<LanguageItem>,
  ) => void
  onRemoveItem: (sectionId: string, itemId: string) => void
  onAddCert: (sectionId: string) => void
  onUpdateCert: (sectionId: string, entryId: string, patch: Partial<CertEntry>) => void
  onAddReference: (sectionId: string) => void
  onUpdateReference: (
    sectionId: string,
    entryId: string,
    patch: Partial<ReferenceEntry>,
  ) => void
}

/**
 * The single dispatch point from a section to its form, mirroring how
 * components/cv/sections/renderers.tsx dispatches rendering. A section type
 * with no form yet renders nothing rather than an empty shell.
 */
export function SectionEditor({
  section,
  labels,
  handlers,
}: {
  section: Section
  labels: CvLabels
  handlers: SectionEditorHandlers
}) {
  const title = sectionTitle(section, labels)

  switch (section.type) {
    case 'summary':
      return (
        <SummaryForm
          label={title}
          onChange={(text) => handlers.onSummaryChange(section.id, text)}
          text={section.text}
        />
      )

    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteering':
    case 'courses':
      return (
        <TimelineForm
          entries={section.entries}
          onAddEntry={handlers.onAddEntry}
          onMoveEntry={handlers.onMoveEntry}
          onRemoveEntry={handlers.onRemoveEntry}
          onUpdateEntry={handlers.onUpdateEntry}
          sectionId={section.id}
          title={title}
        />
      )

    case 'skills':
    case 'languages':
      return (
        <LeveledItemsForm
          items={section.items}
          kind={section.type}
          labels={labels}
          onAddItem={handlers.onAddItem}
          onRemoveItem={handlers.onRemoveItem}
          onUpdateItem={handlers.onUpdateItem}
          sectionId={section.id}
          title={title}
        />
      )

    case 'certifications':
      return (
        <CertificationsForm
          entries={section.entries}
          onAddEntry={handlers.onAddCert}
          onRemoveEntry={handlers.onRemoveEntry}
          onUpdateEntry={handlers.onUpdateCert}
          sectionId={section.id}
          title={title}
        />
      )

    case 'references':
      return (
        <ReferencesForm
          entries={section.entries}
          onAddEntry={handlers.onAddReference}
          onRemoveEntry={handlers.onRemoveEntry}
          onUpdateEntry={handlers.onUpdateReference}
          sectionId={section.id}
          title={title}
        />
      )

    case 'interests':
      return (
        <StringListForm
          label={title}
          onChange={(values) => handlers.onStringListChange(section.id, values)}
          values={section.items}
        />
      )

    case 'drivingLicence':
      return (
        <StringListForm
          label={title}
          onChange={(values) => handlers.onStringListChange(section.id, values)}
          values={section.classes}
        />
      )

    case 'custom':
      if (section.shape === 'text') {
        return (
          <CustomTextForm
            label={title}
            onChange={(text) => handlers.onCustomTextChange(section.id, text)}
            text={section.text ?? ''}
          />
        )
      }
      if (section.shape === 'bullets') {
        return (
          <StringListForm
            label={title}
            onChange={(values) => handlers.onStringListChange(section.id, values)}
            values={section.bullets ?? []}
          />
        )
      }
      return (
        <TimelineForm
          entries={section.entries ?? []}
          onAddEntry={handlers.onAddEntry}
          onMoveEntry={handlers.onMoveEntry}
          onRemoveEntry={handlers.onRemoveEntry}
          onUpdateEntry={handlers.onUpdateEntry}
          sectionId={section.id}
          title={title}
        />
      )

    default:
      return null
  }
}
