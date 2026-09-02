'use client'

import { useTranslations } from 'next-intl'
import { TextField } from '@/components/editor/fields'
import type { Personalia } from '@/lib/schema/cv'

type TextFieldName = 'firstName' | 'lastName' | 'title' | 'email' | 'phone' | 'city' | 'country'

const FIELDS: { name: TextFieldName; labelKey: string; type?: string }[] = [
  { name: 'firstName', labelKey: 'firstName' },
  { name: 'lastName', labelKey: 'lastName' },
  { name: 'title', labelKey: 'professionalTitle' },
  { name: 'email', labelKey: 'email', type: 'email' },
  { name: 'phone', labelKey: 'phone', type: 'tel' },
  { name: 'city', labelKey: 'city' },
  { name: 'country', labelKey: 'country' },
]

export function PersonaliaForm({
  personalia,
  onChange,
}: {
  personalia: Personalia
  onChange: (patch: Partial<Personalia>) => void
}) {
  const t = useTranslations('personalia')

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {t('title')}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <TextField
            key={field.name}
            label={t(field.labelKey)}
            onChange={(value) => onChange({ [field.name]: value })}
            type={field.type}
            value={personalia[field.name]}
          />
        ))}
      </div>
    </section>
  )
}
