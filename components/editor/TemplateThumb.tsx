'use client'

import Image from 'next/image'

import type { Template } from '@/components/cv/types'
import { mmToPx, PAPER } from '@/lib/print/paper'

const PAGE_WIDTH = mmToPx(PAPER.a4.widthMm)
const PAGE_HEIGHT = mmToPx(PAPER.a4.heightMm)

/**
 * A template thumbnail: the still from public/templates, the same one the
 * gallery cards use.
 *
 * Always the demo CV rather than the user's own. A new CV is empty, and an
 * empty sheet shows nothing about a template except its colour.
 *
 * Always A4, whatever paper the CV is set to. The strip answers "which
 * template", not "which paper" - the paper is visible in the preview beside
 * it - and the "+N" tile has always been A4-shaped for the same reason.
 */
export function TemplateThumb({
  template,
  width,
  active,
  onSelect,
}: {
  template: Template
  width: number
  active: boolean
  onSelect: (templateId: string) => void
}) {
  const height = Math.round(width * (PAGE_HEIGHT / PAGE_WIDTH))

  return (
    <button
      aria-current={active ? 'true' : undefined}
      aria-label={template.name}
      className={`group block shrink-0 overflow-hidden rounded-lg bg-white ring-2 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgb(0_0_0/0.45)] focus-visible:ring-brand focus-visible:outline-none ${
        active ? 'ring-brand' : 'ring-border hover:ring-brand/60'
      }`}
      data-template={template.id}
      onClick={() => onSelect(template.id)}
      style={{ width, height }}
      type="button"
    >
      {/* Empty alt: the button carries the template's name already. */}
      <Image alt="" height={height} src={`/templates/${template.id}.png`} width={width} />
    </button>
  )
}
