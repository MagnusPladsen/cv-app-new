'use client'

import { LayoutGrid } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { TEMPLATES } from '@/components/cv/templates'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createDemoDocument } from '@/lib/schema/demo'
import { TemplateDialog } from './TemplateDialog'
import { TemplateThumb } from './TemplateThumb'

/** How many fit comfortably before the row starts to feel like a list. */
const VISIBLE = 4
const THUMB_WIDTH = 84

/**
 * Template switching, kept in plain sight rather than behind a disclosure.
 *
 * Shows a few, then a "+N" tile into the full set. The thumbnails render demo
 * content: a new CV is empty, and an empty sheet says nothing about a template.
 */
export function TemplateStrip({
  document,
  onSelect,
}: {
  document: CvDocumentData
  onSelect: (templateId: string) => void
}) {
  const t = useTranslations('design')
  const [dialogOpen, setDialogOpen] = useState(false)

  const demo = useMemo(() => createDemoDocument({ paper: document.paper }), [document.paper])

  // Always include the active template, even if it sits outside the first few.
  const activeIndex = TEMPLATES.findIndex(
    (template) => template.id === document.theme.templateId,
  )
  const shown =
    activeIndex >= VISIBLE
      ? [...TEMPLATES.slice(0, VISIBLE - 1), TEMPLATES[activeIndex]!]
      : TEMPLATES.slice(0, VISIBLE)

  const remaining = TEMPLATES.length - shown.length

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t('templates')}
      </h2>

      {/* Wraps rather than scrolls: five fixed tiles are wider than a phone,
          and a wrapped second row is tidier than a hidden scroll area. */}
      <ul className="flex flex-wrap items-start gap-3">
        {shown.map((template) => (
          <li className="flex flex-col items-center gap-1.5" key={template.id}>
            <TemplateThumb
              active={template.id === document.theme.templateId}
              document={demo}
              onSelect={onSelect}
              template={template}
              width={THUMB_WIDTH}
            />
            <span
              className={`text-[11px] font-medium ${
                template.id === document.theme.templateId
                  ? 'text-brand-strong'
                  : 'text-muted-foreground'
              }`}
            >
              {template.name}
            </span>
          </li>
        ))}

        {remaining > 0 ? (
          <li className="flex flex-col items-center gap-1.5">
            <button
              aria-label={t('moreLabel', { count: remaining })}
              className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-card text-sm font-bold text-muted-foreground transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              onClick={() => setDialogOpen(true)}
              style={{ width: THUMB_WIDTH, height: THUMB_WIDTH * (297 / 210) }}
              type="button"
            >
              <LayoutGrid aria-hidden="true" className="size-4" />
              {t('more', { count: remaining })}
            </button>
            <span className="text-[11px] font-medium text-muted-foreground">
              {t('allTemplates')}
            </span>
          </li>
        ) : null}
      </ul>

      <TemplateDialog
        activeTemplateId={document.theme.templateId}
        document={demo}
        onClose={() => setDialogOpen(false)}
        onSelect={onSelect}
        open={dialogOpen}
      />
    </section>
  )
}
