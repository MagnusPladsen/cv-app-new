'use client'

import { TextAreaField } from '@/components/editor/fields'

export function CustomTextForm({
  label,
  text,
  onChange,
}: {
  label: string
  text: string
  onChange: (text: string) => void
}) {
  return <TextAreaField label={label} onChange={onChange} rows={5} value={text} />
}
