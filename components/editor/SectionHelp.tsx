'use client'

import { HelpCircle, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * The short version of "what goes in here, and how should I write it".
 *
 * A click-to-open popover rather than a hover tooltip: hover reaches neither a
 * touch screen nor a keyboard, and this is advice somebody wants to keep on
 * screen while they type rather than something that disappears the moment the
 * pointer moves. It is anchored rather than inline so that opening it does not
 * push the form down and lose the field you were looking at.
 *
 * Every tip is a few short lines, one idea each. Each line is its own
 * paragraph with space around it: run together, advice that does not belong
 * to the sentence before it reads as a wall.
 */
export function SectionHelp({ topic }: { topic: string }) {
  const t = useTranslations('help')
  const [open, setOpen] = useState(false)
  const id = useId()
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
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        aria-label={t('open')}
        className={`inline-flex size-7 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          open
            ? 'bg-brand-soft text-brand-strong'
            : 'text-muted-foreground hover:bg-brand-soft hover:text-brand-strong'
        }`}
        onClick={() => setOpen((was) => !was)}
        ref={buttonRef}
        type="button"
      >
        <HelpCircle aria-hidden="true" className="size-4" />
      </button>

      {open ? (
        <div
          className="absolute top-full right-0 z-30 mt-1 flex w-[min(20rem,calc(100vw-3rem))] gap-2 rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-foreground/85 shadow-lg"
          id={id}
          role="note"
        >
          <div className="flex flex-1 flex-col gap-2">
            {t(topic)
              .split('\n')
              .map((line) => (
                <p key={line}>{line}</p>
              ))}
          </div>
          <button
            aria-label={t('close')}
            className="size-5 shrink-0 rounded text-muted-foreground transition hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            onClick={() => {
              setOpen(false)
              buttonRef.current?.focus()
            }}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
