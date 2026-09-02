'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { getTemplate, TEMPLATES } from '@/components/cv/templates'
import { TemplateCard } from '@/components/gallery/TemplateCard'
import { Link, useRouter } from '@/i18n/navigation'
import { createDemoDocument } from '@/lib/schema/demo'
import { useDocuments } from '@/lib/store/documents'

export default function TemplateGalleryPage() {
  const t = useTranslations('gallery')
  const router = useRouter()
  const createDocument = useDocuments((state) => state.createDocument)

  // One demo document shared by every card, so the comparison is like for like.
  const demo = useMemo(() => createDemoDocument(), [])

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
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-neutral-600">{t('subtitle')}</p>
        <Link className="text-sm underline underline-offset-4" href="/cv">
          {t('back')}
        </Link>
      </div>

      <ul className="grid grid-cols-1 justify-items-center gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => (
          <TemplateCard
            document={demo}
            key={template.id}
            onChoose={handleChoose}
            template={template}
          />
        ))}
      </ul>
    </main>
  )
}
