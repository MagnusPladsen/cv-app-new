'use client'

import { Calendar, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState } from 'react'

import { controlClass } from '@/components/editor/fields'

/**
 * A month picker that exists in every browser.
 *
 * These fields were `<input type="month">`, which Chrome, Edge and Safari turn
 * into a picker and **Firefox does not implement at all** — there it is a bare
 * text box in which the only way to enter August 2021 is to know that the
 * format is `2021-08`. Nothing about the control says so.
 *
 * So: a button showing the month in the reader's language, and a small panel
 * of twelve months with a year stepper. No dependency, no calendar grid — a CV
 * never needs a day, and offering one invites people to enter a start date of
 * the 3rd.
 *
 * The stored value stays `"YYYY-MM"`, which is what the schema and every
 * template renderer already expect.
 */

const MONTHS = Array.from({ length: 12 }, (_, index) => index)

function parse(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month: month - 1 }
}

function format(value: string, locale: string): string {
  const parsed = parse(value)
  if (!parsed) return ''
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(parsed.year, parsed.month, 1),
  )
}

export function MonthField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hint?: string
}) {
  const t = useTranslations('editor')
  const locale = useLocale()
  const id = useId()
  const panelId = `${id}-panel`

  const [open, setOpen] = useState(false)
  const parsed = parse(value)
  // The year the panel is showing, which is not the selected year until
  // something is selected: a blank field should open on this year, not 1970.
  const [year, setYear] = useState(() => parsed?.year ?? new Date().getFullYear())
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Focus goes back to the control that opened the panel, or it lands on
      // the body and the next Tab starts from the top of the page.
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const monthName = (month: number) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, month, 1))

  function choose(month: number) {
    onChange(`${year}-${String(month + 1).padStart(2, '0')}`)
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm" ref={wrapRef}>
      <span className="font-medium text-foreground" id={`${id}-label`}>
        {label}
      </span>

      <div className="relative">
        <button
          aria-controls={open ? panelId : undefined}
          aria-expanded={open}
          aria-labelledby={`${id}-label ${id}`}
          className={`${controlClass} flex items-center justify-between gap-2 text-left`}
          disabled={disabled}
          id={id}
          onClick={() => {
            // Re-open on the selected year rather than wherever the stepper
            // was left last time.
            if (!open) setYear(parse(value)?.year ?? new Date().getFullYear())
            setOpen((was) => !was)
          }}
          ref={buttonRef}
          type="button"
        >
          <span className={value ? '' : 'text-muted-foreground'}>
            {format(value, locale) || t('monthPlaceholder')}
          </span>
          <Calendar aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>

        {open ? (
          <div
            aria-labelledby={`${id}-label`}
            className="absolute top-full right-0 left-0 z-30 mt-1 flex min-w-56 flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-lg"
            id={panelId}
            role="dialog"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                aria-label={t('previousYear')}
                className="rounded-lg px-2 py-1 text-sm hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                onClick={() => setYear((current) => current - 1)}
                type="button"
              >
                ‹
              </button>
              <span aria-live="polite" className="text-sm font-semibold tabular-nums">
                {year}
              </span>
              <button
                aria-label={t('nextYear')}
                className="rounded-lg px-2 py-1 text-sm hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                onClick={() => setYear((current) => current + 1)}
                type="button"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((month) => {
                const selected = parsed?.year === year && parsed.month === month
                return (
                  <button
                    aria-current={selected ? 'true' : undefined}
                    className={`rounded-lg px-2 py-1.5 text-sm capitalize transition ${
                      selected
                        ? 'bg-brand font-semibold text-brand-ink'
                        : 'hover:bg-brand-soft hover:text-brand-strong'
                    } focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none`}
                    key={month}
                    onClick={() => choose(month)}
                    type="button"
                  >
                    {monthName(month)}
                  </button>
                )
              })}
            </div>

            {value ? (
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
                type="button"
              >
                <X aria-hidden="true" className="size-3.5" />
                {t('clearMonth')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
