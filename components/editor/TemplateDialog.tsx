'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { TEMPLATES } from '@/components/cv/templates'
import { TemplateThumb } from './TemplateThumb'

const THUMB_WIDTH = 150

export function TemplateDialog({
  activeTemplateId,
  open,
  onSelect,
  onClose,
}: {
  activeTemplateId: string
  open: boolean
  onSelect: (templateId: string) => void
  onClose: () => void
}) {
  const t = useTranslations('design')
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const openerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return

    openerRef.current = window.document.activeElement
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.document.addEventListener('keydown', onKeyDown)

    return () => {
      window.document.removeEventListener('keydown', onKeyDown)
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-hidden="true"
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />

      <div
        aria-labelledby="template-dialog-title"
        aria-modal="true"
        className="relative flex max-h-[85dvh] w-full flex-col gap-4 overflow-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:m-4 sm:max-w-3xl sm:rounded-3xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold" id="template-dialog-title">
            {t('allTemplates')}
          </h2>
          <button
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
            {t('close')}
          </button>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TEMPLATES.map((template) => (
            <li className="flex flex-col items-center gap-2" key={template.id}>
              <TemplateThumb
                active={template.id === activeTemplateId}
                onSelect={(id) => {
                  onSelect(id)
                  onClose()
                }}
                template={template}
                width={THUMB_WIDTH}
              />
              <span
                className={`text-xs font-semibold ${
                  template.id === activeTemplateId
                    ? 'text-brand-strong'
                    : 'text-muted-foreground'
                }`}
              >
                {template.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
