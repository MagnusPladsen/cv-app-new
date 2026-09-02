'use client'

import { useId } from 'react'

export function ColourPicker({
  label,
  customLabel,
  value,
  swatches,
  onChange,
}: {
  label: string
  customLabel: string
  value: string
  swatches: string[]
  onChange: (value: string) => void
}) {
  const inputId = useId()

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-neutral-700">{label}</span>

      <div className="flex flex-wrap items-center gap-2">
        {swatches.map((swatch) => (
          <button
            aria-label={swatch}
            aria-pressed={swatch.toLowerCase() === value.toLowerCase()}
            className={`size-7 rounded-full border-2 transition ${
              swatch.toLowerCase() === value.toLowerCase()
                ? 'border-neutral-900'
                : 'border-transparent hover:border-neutral-300'
            }`}
            key={swatch}
            onClick={() => onChange(swatch)}
            style={{ backgroundColor: swatch }}
            type="button"
          />
        ))}

        <label className="ml-1 flex items-center gap-2 text-xs text-neutral-600" htmlFor={inputId}>
          {customLabel}
        </label>
        <input
          className="size-7 cursor-pointer rounded border border-neutral-200 bg-transparent p-0"
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value}
        />
      </div>
    </div>
  )
}
