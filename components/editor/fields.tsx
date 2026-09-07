'use client'

import { useId, type ReactNode } from 'react'

export const controlClass =
  'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-sand-deep disabled:text-muted-foreground/70'

/**
 * The hint is a sibling of the label, never a child. Nesting it would fold the
 * hint text into the control's accessible name.
 */
function FieldShell({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label className="font-medium text-foreground" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  disabled?: boolean
  hint?: string
}) {
  const id = useId()
  return (
    <FieldShell hint={hint} id={id} label={label}>
      <input
        className={controlClass}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  hint?: string
}) {
  const id = useId()
  return (
    <FieldShell hint={hint} id={id} label={label}>
      <textarea
        className={controlClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </FieldShell>
  )
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label}>
      <select
        className={controlClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
