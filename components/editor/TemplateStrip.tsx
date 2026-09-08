'use client'

import { useTranslations } from 'next-intl'

import { CvDocument } from '@/components/cv/CvDocument'
import { TEMPLATES } from '@/components/cv/templates'
import { Link } from '@/i18n/navigation'
import { mmToPx, PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

/**
 * Live thumbnails of every template, always visible in the editor.
 *
 * Switching template is the single most consequential thing a person does here,
 * so it does not belong behind a "Design" disclosure. Each thumbnail previews
 * the user's own CV, not a demo, so the choice is concrete.
 */
/** Fixed, so the scale is a plain number rather than a container query. */
const THUMB_WIDTH_PX = 74

export function TemplateStrip({
  document,
  onSelect,
}: {
  document: CvDocumentData
  onSelect: (templateId: string) => void
}) {
  const t = useTranslations('design')
  const pageWidth = mmToPx(PAPER[document.paper].widthMm)
  const pageHeight = mmToPx(PAPER[document.paper].heightMm)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t('templates')}
        </h2>
        <Link
          className="text-xs font-semibold text-brand underline-offset-4 transition hover:underline"
          href="/templates"
        >
          {t('seeAll')}
        </Link>
      </div>

      {/* A scroll strip on every size: it makes "there are more" self-evident
          in a way a wrapped grid does not. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {TEMPLATES.map((template) => {
          const active = template.id === document.theme.templateId
          return (
            <li className="shrink-0 snap-start" key={template.id}>
              <button
                aria-current={active ? 'true' : undefined}
                aria-label={template.name}
                className={`group block overflow-hidden rounded-lg bg-white ring-2 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgb(0_0_0/0.4)] focus-visible:outline-none ${
                  active
                    ? 'ring-brand'
                    : 'ring-border hover:ring-brand/60 focus-visible:ring-brand'
                }`}
                onClick={() => onSelect(template.id)}
                style={{ width: THUMB_WIDTH_PX, height: THUMB_WIDTH_PX * (pageHeight / pageWidth) }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="block origin-top-left"
                  style={{
                    width: pageWidth,
                    height: pageHeight,
                    transform: `scale(${THUMB_WIDTH_PX / pageWidth})`,
                  }}
                >
                  <CvDocument
                    document={{
                      ...document,
                      theme: {
                        ...document.theme,
                        templateId: template.id,
                        accent: template.defaultAccent,
                        fontPairId: template.defaultFontPairId ?? document.theme.fontPairId,
                      },
                    }}
                  />
                </span>
              </button>
              <span
                className={`mt-1 block text-center text-[11px] font-medium ${
                  active ? 'text-brand-strong' : 'text-muted-foreground'
                }`}
              >
                {template.name}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
