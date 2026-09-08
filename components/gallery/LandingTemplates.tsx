'use client'

import { useMemo } from 'react'

import { getTemplate, TEMPLATES } from '@/components/cv/templates'
import { TemplateCard } from '@/components/gallery/TemplateCard'
import { useRouter } from '@/i18n/navigation'
import { createDemoDocument } from '@/lib/schema/demo'
import { useDocuments } from '@/lib/store/documents'

/**
 * The same cards as the gallery, so a template looks and behaves identically
 * wherever it is shown. Choosing one here starts a CV directly.
 */
export function LandingTemplates({ limit }: { limit?: number }) {
  const router = useRouter()
  const createDocument = useDocuments((state) => state.createDocument)
  const demo = useMemo(() => createDemoDocument(), [])

  const shown = limit ? TEMPLATES.slice(0, limit) : TEMPLATES

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
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
      {shown.map((template) => (
        <TemplateCard
          document={demo}
          key={template.id}
          onChoose={handleChoose}
          template={template}
        />
      ))}
    </ul>
  )
}
