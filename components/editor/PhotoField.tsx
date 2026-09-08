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
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
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
          <div className="size-16 shrink-0 rounded-full bg-sand-deep" />
        )}

        <div className="flex flex-col gap-2">
          <label
            className="cursor-pointer rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
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
              className="text-left rounded text-sm font-medium text-muted-foreground underline-offset-2 transition hover:text-brand-strong hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              onClick={onRemove}
              type="button"
            >
              {t('remove')}
            </button>
          ) : null}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          checked={showPhoto}
          onChange={(event) => onToggle(event.target.checked)}
          type="checkbox"
        />
        {t('show')}
      </label>
      <p className="text-xs text-muted-foreground">{t('norwegianNote')}</p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  )
}
