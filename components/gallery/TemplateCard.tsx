'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

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
}: {
  template: Template
  onChoose: (templateId: string) => void
}) {
  const t = useTranslations('gallery')

  return (
    <li className="group flex flex-col gap-2.5">
      <button
        aria-label={template.name}
        className="relative block w-full overflow-hidden rounded-xl bg-white ring-1 ring-border transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_45px_-18px_rgb(0_0_0/0.4)] group-hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        // A handle that survives a rename: the card used to be found by the
        // CV markup it rendered, and its display name is branding ("oslo" is
        // called Klassisk), so neither is something to select on.
        data-template={template.id}
        onClick={() => onChoose(template.id)}
        style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
        type="button"
      >
        {/* Empty alt: the button is labelled with the template's name, so a
            screen reader is not read the thumbnail twice. */}
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
          src={`/templates/${template.id}.png`}
        />

        <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent p-3 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-ink shadow-lg transition duration-200 group-hover:scale-105 group-hover:bg-brand-strong group-hover:shadow-xl">
            {t('choose')}
          </span>
        </span>
      </button>

      <span className="text-sm font-semibold">{template.name}</span>
    </li>
  )
}
