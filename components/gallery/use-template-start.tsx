'use client'

import dynamic from 'next/dynamic'
import { useState, type ReactNode } from 'react'

import { getTemplate } from '@/components/cv/templates'
import type { Template } from '@/components/cv/types'
import { useRouter } from '@/i18n/navigation'
import type { ParsedCv } from '@/lib/import/parse-cv'
import type { ImportChoice } from '@/lib/import/to-document'

// Loaded when a card is first clicked. The landing page shows these cards to
// every visitor, and the dialog - with the import button behind it - serves
// only the ones who pick one.
const TemplateStartDialog = dynamic(
  () => import('./TemplateStartDialog').then((module) => module.TemplateStartDialog),
  { ssr: false },
)

const lookOf = (template: Template) => ({
  templateId: template.id,
  accent: template.defaultAccent,
  fontPairId: template.defaultFontPairId,
})

/**
 * What happens when somebody picks a template card, wherever the card is:
 * a dialog offering a blank CV or an import, both in that template.
 *
 * The store and the import code are imported on use rather than at the top.
 * They are the only things these pages need them for, and a static import put
 * the store, immer and zod into the first JavaScript every visitor downloads.
 */
export function useTemplateStart(): {
  /** A template card was picked. */
  choose: (templateId: string) => void
  /** "Kom i gang", with no template picked yet. */
  begin: () => void
  dialog: ReactNode
} {
  const router = useRouter()
  // null: closed. 'any': open, with no template chosen yet.
  const [chosen, setChosen] = useState<Template | 'any' | null>(null)

  async function start(template: Template | 'any') {
    // Nothing picked yet, so the next step is picking: the gallery, not an
    // editor in whichever template happened to be first.
    if (template === 'any') {
      router.push('/templates')
      return
    }
    const { useDocuments } = await import('@/lib/store/documents')
    const id = useDocuments.getState().createDocument(lookOf(template))
    router.push(`/cv/${id}`)
  }

  // The same validated path the dashboard's import takes, with the look the
  // person just picked instead of the default one.
  async function importInto(template: Template | 'any', parsed: ParsedCv, choice: ImportChoice) {
    const [{ useDocuments }, { documentFromParse }] = await Promise.all([
      import('@/lib/store/documents'),
      import('@/lib/import/to-document'),
    ])
    // With no template picked the default look is used, and the template
    // strip in the editor is one click away.
    const look = template === 'any' ? {} : lookOf(template)
    const result = useDocuments.getState().importDocument(documentFromParse(parsed, choice, look))
    if (result.ok) router.push(`/cv/${result.id}`)
  }

  const dialog = chosen ? (
    <TemplateStartDialog
      onClose={() => setChosen(null)}
      onImport={(parsed, choice) => void importInto(chosen, parsed, choice)}
      onStart={() => void start(chosen)}
      template={chosen === 'any' ? null : chosen}
    />
  ) : null

  return {
    choose: (templateId) => setChosen(getTemplate(templateId)),
    begin: () => setChosen('any'),
    dialog,
  }
}
