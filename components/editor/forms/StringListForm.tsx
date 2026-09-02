'use client'

import { useTranslations } from 'next-intl'
import { TextAreaField } from '@/components/editor/fields'

/**
 * Edits a string[] through one textarea, one value per line. Faster than
 * add/remove rows for short values, and identical on mobile and desktop.
 *
 * Lines are stored raw, blanks included: filtering as the user types would
 * delete the empty line the moment they press Enter, making a second item
 * impossible to add. Every renderer in components/cv/sections trims and drops
 * blanks at render time, so nothing empty reaches the CV.
 */
export function StringListForm({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  const t = useTranslations('forms')

  return (
    <TextAreaField
      hint={t('onePerLine')}
      label={label}
      onChange={(text) => onChange(text.split('\n'))}
      value={values.join('\n')}
    />
  )
}
