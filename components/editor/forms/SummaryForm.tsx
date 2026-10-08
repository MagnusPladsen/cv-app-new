'use client'

import { useTranslations } from 'next-intl'
import { AskAi } from '@/components/editor/AskAi'
import { TextAreaField } from '@/components/editor/fields'

export function SummaryForm({
  label,
  sectionId,
  text,
  onChange,
}: {
  label: string
  sectionId: string
  text: string
  onChange: (text: string) => void
}) {
  const t = useTranslations('forms')
  return (
    <div className="flex flex-col gap-2">
      <TextAreaField
        hint={t('summaryHint')}
        label={label}
        onChange={onChange}
        rows={5}
        value={text}
      />

      {/* Second of the three. Om meg is read first and is the hardest
          paragraph on the page to write about yourself. */}
      <AskAi
        drafts={[{ kind: 'summary', sectionId, label, text }]}
        label={t('askSummary')}
        targets={[{ kind: 'summary', sectionId, label }]}
        task="summary"
      />
    </div>
  )
}
