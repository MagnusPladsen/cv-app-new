'use client'

import { useTranslations } from 'next-intl'
import type { Personalia } from '@/lib/schema/cv'

type TextField = 'firstName' | 'lastName' | 'title' | 'email' | 'phone' | 'city' | 'country'

const FIELDS: { name: TextField; labelKey: string; type?: string }[] = [
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
    <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {t('title')}
      </legend>
      {FIELDS.map((field) => (
        <label className="flex flex-col gap-1.5 text-sm" key={field.name}>
          <span className="font-medium text-neutral-700">{t(field.labelKey)}</span>
          <input
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10"
            type={field.type ?? 'text'}
            value={personalia[field.name]}
            onChange={(event) => onChange({ [field.name]: event.target.value })}
          />
        </label>
      ))}
    </fieldset>
  )
}
