'use client'

import { useTranslations } from 'next-intl'

import { SelectField } from '@/components/editor/fields'
import type { Section } from '@/lib/schema/cv'

export type CustomShape = 'entries' | 'bullets' | 'text'

/**
 * Which shape a custom section's content takes.
 *
 * Renaming used to live here too, as a full-width card above every section's
 * form. With all sections on screen at once that put a large "Overskrift på
 * CV-en" box between each one, which buried the forms and said nothing about
 * which section you were looking at. Renaming moved to the section list,
 * beside the switch that turns the section on.
 */
export function SectionSettings({
  section,
  onShapeChange,
}: {
  section: Section
  onShapeChange: (sectionId: string, shape: CustomShape) => void
}) {
  const t = useTranslations('sections')

  if (section.type !== 'custom') return null

  const shapeOptions: { value: CustomShape; label: string }[] = [
    { value: 'entries', label: t('shapeEntries') },
    { value: 'bullets', label: t('shapeBullets') },
    { value: 'text', label: t('shapeText') },
  ]

  return (
    <SelectField
      label={t('shapeLabel')}
      onChange={(shape) => onShapeChange(section.id, shape as CustomShape)}
      options={shapeOptions}
      value={section.shape}
    />
  )
}
