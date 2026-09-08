'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { getTemplate, TEMPLATES } from '@/components/cv/templates'
import type { TemplateTag } from '@/components/cv/types'
import { TemplateCard } from '@/components/gallery/TemplateCard'
import { Link, useRouter } from '@/i18n/navigation'
import { createDemoDocument } from '@/lib/schema/demo'
import { useDocuments } from '@/lib/store/documents'

type Filter = TemplateTag | 'all'

const FILTERS: { id: Filter; labelKey: string }[] = [
  { id: 'all', labelKey: 'filterAll' },
  { id: 'ats', labelKey: 'filterAts' },
  { id: 'simple', labelKey: 'filterSimple' },
  { id: 'modern', labelKey: 'filterModern' },
  { id: 'professional', labelKey: 'filterProfessional' },
  { id: 'creative', labelKey: 'filterCreative' },
  { id: 'one-column', labelKey: 'filterOneColumn' },
]

export default function TemplateGalleryPage() {
  const t = useTranslations('gallery')
  const router = useRouter()
  const createDocument = useDocuments((state) => state.createDocument)
  const [filter, setFilter] = useState<Filter>('all')

  // One demo document shared by every card, so the comparison is like for like.
  const demo = useMemo(() => createDemoDocument(), [])

  const visible = TEMPLATES.filter(
    (template) => filter === 'all' || template.tags.includes(filter),
  )

  function handleChoose(templateId: string) {
    const template = getTemplate(templateId)
    const id = createDocument({
      templateId: template.id,
      accent: template.defaultAccent,
      fontPairId: template.defaultFontPairId,
    })
    router.push(`/cv/${id}`)
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
          <span className="text-sm font-medium text-muted-foreground">
            {t('count', { count: TEMPLATES.length })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground sm:text-base">{t('subtitle')}</p>
      </div>

      {/* Horizontally scrollable on a phone rather than wrapping to three rows. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {FILTERS.map((option) => {
            const active = option.id === filter
            return (
              <button
                aria-pressed={active}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? 'border-brand bg-brand text-brand-ink'
                    : 'border-border bg-card text-muted-foreground hover:border-brand hover:text-brand-strong'
                }`}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {t(option.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        /* Cards cap out around 220px: more columns on a wide screen rather than
           bigger thumbnails, which are harder to compare, not easier. */
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((template) => (
            <TemplateCard
              document={demo}
              key={template.id}
              onChoose={handleChoose}
              template={template}
            />
          ))}
        </ul>
      )}

      <div>
        <Link
          className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
          href="/cv"
        >
          {t('back')}
        </Link>
      </div>
    </main>
  )
}
