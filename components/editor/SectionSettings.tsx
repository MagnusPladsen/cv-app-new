'use client'

import { useTranslations } from 'next-intl'

import { sectionTitle } from '@/components/cv/sections'
import { SelectField, TextField } from '@/components/editor/fields'
import type { CvLabels } from '@/lib/cv-labels'
import type { Section } from '@/lib/schema/cv'

export type CustomShape = 'entries' | 'bullets' | 'text'

/**
 * Per-section settings shown above the section's own form: the heading that
 * will appear on the CV, and for a custom section which shape its content takes.
 *
 * Both were reachable in the store long before they were reachable in the UI.
 */
export function SectionSettings({
  section,
  labels,
  onRename,
  onShapeChange,
}: {
  section: Section
  labels: CvLabels
  onRename: (sectionId: string, title: string) => void
  onShapeChange: (sectionId: string, shape: CustomShape) => void
}) {
  const t = useTranslations('sections')

  // Show the raw override once one exists, blank included, so the field can be
  // cleared and retyped. Before any edit it shows the localized label.
  const headingValue =
    section.type === 'custom'
      ? section.title
      : (section.titleOverride ?? sectionTitle(section, labels))

  const shapeOptions: { value: CustomShape; label: string }[] = [
    { value: 'entries', label: t('shapeEntries') },
    { value: 'bullets', label: t('shapeBullets') },
    { value: 'text', label: t('shapeText') },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <TextField
        hint={t('renameHint')}
        label={t('renameLabel')}
        onChange={(title) => onRename(section.id, title)}
        value={headingValue}
      />

      {section.type === 'custom' ? (
        <SelectField
          label={t('shapeLabel')}
          onChange={(shape) => onShapeChange(section.id, shape as CustomShape)}
          options={shapeOptions}
          value={section.shape}
        />
      ) : null}
    </div>
  )
}
