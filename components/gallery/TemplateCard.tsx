'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import type { Template } from '@/components/cv/types'
import { mmToPx, PAPER } from '@/lib/print/paper'

const PAGE_WIDTH = mmToPx(PAPER.a4.widthMm)
const PAGE_HEIGHT = mmToPx(PAPER.a4.heightMm)

/**
 * Card width is capped rather than fluid: a CV thumbnail rendered huge on a
 * wide monitor is harder to compare, not easier. The grid adds columns instead.
 *
 * The thumbnail is a still from scripts/generate-template-thumbnails.mjs, not
 * a live CV. Fourteen typeset documents on one page cost about two thousand
 * DOM nodes that the browser reworked on every scroll and resize, and the
 * cards were never interactive - each one shows the demo CV in the template's
 * own default colours, which is exactly what the still holds.
 */
export function TemplateCard({
  template,
  onChoose,
  className = '',
}: {
  template: Template
  onChoose: (templateId: string) => void
  /** Lets a grid decide whether this card appears at a given width. */
  className?: string
}) {
  const t = useTranslations('gallery')
  const frame = useRef<HTMLDivElement | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  /**
   * The sheet leans toward the pointer. Read off the card's own box rather
   * than the event's offset, which jumps as the pointer crosses the label and
   * the overlay inside it.
   */
  function lean(event: React.PointerEvent<HTMLDivElement>) {
    const box = frame.current?.getBoundingClientRect()
    if (!box || event.pointerType !== 'mouse') return
    setTilt({
      x: ((event.clientY - box.top) / box.height - 0.5) * -8,
      y: ((event.clientX - box.left) / box.width - 0.5) * 10,
    })
  }

  return (
    <li className={`group flex flex-col gap-2.5 [perspective:1200px] ${className}`}>
      {/* The stack lives outside the button, which clips its own image to a
          rounded corner; sheets fanned behind it would be clipped away. */}
      <div
        className="relative transition-transform duration-200 ease-out [transform-style:preserve-3d] group-hover:scale-[1.04] group-focus-within:scale-[1.04] motion-reduce:!transform-none"
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        onPointerMove={lean}
        ref={frame}
        style={{
          aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}`,
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          ['--card-scale' as string]: '1',
        }}
      >
        {/* Two more sheets, fanned out on hover: a template is a stack of
            pages, and the fan is what says so before anything is clicked. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-xl bg-white opacity-0 shadow-[0_14px_30px_-18px_rgb(0_0_0/0.45)] transition duration-300 ease-out group-hover:translate-x-[13%] group-hover:-translate-y-[6%] group-hover:rotate-[7deg] group-hover:opacity-90 group-focus-within:translate-x-[13%] group-focus-within:-translate-y-[6%] group-focus-within:rotate-[7deg] group-focus-within:opacity-90 motion-reduce:!transform-none motion-reduce:!opacity-0"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-xl bg-white opacity-0 shadow-[0_12px_26px_-18px_rgb(0_0_0/0.4)] transition duration-300 ease-out group-hover:translate-x-[6.5%] group-hover:-translate-y-[3%] group-hover:rotate-[3.5deg] group-hover:opacity-95 group-focus-within:translate-x-[6.5%] group-focus-within:-translate-y-[3%] group-focus-within:rotate-[3.5deg] group-focus-within:opacity-95 motion-reduce:!transform-none motion-reduce:!opacity-0"
        />
      <button
        aria-label={template.name}
        className="relative block h-full w-full overflow-hidden rounded-xl bg-white shadow-[0_8px_18px_-14px_rgb(0_0_0/0.4)] transition duration-200 group-hover:shadow-[0_30px_54px_-22px_rgb(0_0_0/0.45)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        // A handle that survives a rename: the card used to be found by the
        // CV markup it rendered, and its display name is branding ("oslo" is
        // called Klassisk), so neither is something to select on.
        data-template={template.id}
        onClick={() => onChoose(template.id)}
        type="button"
      >
        {/* Empty alt: the button is labelled with the template's name, so a
            screen reader is not read the thumbnail twice. */}
        <Image
          alt=""
          className="object-cover"
          fill
          // A fixed width, not a list of viewport fractions. The card is
          // capped around 220px at every breakpoint, and each distinct size
          // here is another variant Next has to generate on first request -
          // with eighteen templates that was slow enough to time out a
          // browser test.
          // 65 rather than the default 75: these are 240px thumbnails of a
          // page of text, where the difference is invisible and the bytes are
          // not - eighteen of them load on the gallery.
          quality={65}
          sizes="240px"
          src={`/templates/${template.id}.png`}
        />

        <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent p-3 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-ink shadow-lg transition duration-200 group-hover:scale-105 group-hover:bg-brand-strong group-hover:shadow-xl">
            {t('choose')}
          </span>
        </span>

        {/* A sheen that slides with the lean, so the paper reads as paper
            rather than a picture of it. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:!opacity-0"
          style={{
            background: `linear-gradient(${105 + tilt.y * 2}deg, transparent 42%, rgb(255 255 255 / 0.16) ${50 + tilt.y * 1.6}%, transparent 58%)`,
          }}
        />
      </button>
      </div>

      <span className="text-sm font-semibold">{template.name}</span>
    </li>
  )
}
