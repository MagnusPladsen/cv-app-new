'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

export function BackupControls({
  onImportText,
}: {
  onImportText: (text: string) => { ok: boolean }
}) {
  const t = useTranslations('dashboard')
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)

    const text = await file.text()
    if (!onImportText(text).ok) setError(t('importFailed'))
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        className="w-fit cursor-pointer rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold transition hover:border-neutral-900"
        htmlFor={inputId}
      >
        {t('import')}
      </label>
      <input
        accept="application/json,.json"
        className="sr-only"
        id={inputId}
        onChange={(event) => handleFile(event.target.files?.[0])}
        type="file"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
