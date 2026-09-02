'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { compressImage } from '@/lib/image/compress'
import type { Personalia } from '@/lib/schema/cv'

export function PhotoField({
  photo,
  showPhoto,
  onChange,
  onToggle,
  onRemove,
  compress = compressImage,
}: {
  photo: Personalia['photo']
  showPhoto: boolean
  onChange: (dataUrl: string) => void
  onToggle: (show: boolean) => void
  onRemove: () => void
  compress?: typeof compressImage
}) {
  const t = useTranslations('photo')
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError(t('notAnImage'))
      return
    }

    try {
      onChange(await compress(file))
    } catch {
      setError(t('failed'))
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {t('label')}
      </h2>

      <div className="flex items-center gap-4">
        {photo?.dataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- an inline data URL */
          <img
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
            src={photo.dataUrl}
          />
        ) : (
          <div className="size-16 shrink-0 rounded-full bg-neutral-100" />
        )}

        <div className="flex flex-col gap-2">
          <label
            className="cursor-pointer rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold transition hover:border-neutral-900"
            htmlFor={inputId}
          >
            {photo?.dataUrl ? t('replace') : t('upload')}
          </label>
          <input
            accept="image/*"
            className="sr-only"
            id={inputId}
            onChange={(event) => handleFile(event.target.files?.[0])}
            type="file"
          />

          {photo?.dataUrl ? (
            <button
              className="text-left text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
              onClick={onRemove}
              type="button"
            >
              {t('remove')}
            </button>
          ) : null}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          checked={showPhoto}
          onChange={(event) => onToggle(event.target.checked)}
          type="checkbox"
        />
        {t('show')}
      </label>
      <p className="text-xs text-neutral-500">{t('norwegianNote')}</p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  )
}
