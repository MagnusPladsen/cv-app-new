'use client'

import { useTranslations } from 'next-intl'
import { TextAreaField } from '@/components/editor/fields'

export function SummaryForm({
  label,
  text,
  onChange,
}: {
  label: string
  text: string
  onChange: (text: string) => void
}) {
  const t = useTranslations('forms')
  return (
    <TextAreaField
      hint={t('summaryHint')}
      label={label}
      onChange={onChange}
      rows={5}
      value={text}
    />
  )
}
