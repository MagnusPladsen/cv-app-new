'use client'

import { useTranslations } from 'next-intl'

import { SelectField, TextField } from '@/components/editor/fields'
import type { CvLabels } from '@/lib/cv-labels'
import type { LanguageItem, LanguageLevel, SkillItem, SkillLevel } from '@/lib/schema/cv'

const SKILL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5]
const LANGUAGE_LEVELS: LanguageLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native']

export type LeveledItemsKind = 'skills' | 'languages'

export function LeveledItemsForm({
  sectionId,
  title,
  kind,
  items,
  labels,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: {
  sectionId: string
  title: string
  kind: LeveledItemsKind
  items: SkillItem[] | LanguageItem[]
  labels: CvLabels
  onAddItem: (sectionId: string) => void
  onUpdateItem: (
    sectionId: string,
    itemId: string,
    patch: Partial<SkillItem> | Partial<LanguageItem>,
  ) => void
  onRemoveItem: (sectionId: string, itemId: string) => void
}) {
  const t = useTranslations('items')

  // Options come from the CV label dictionary, so the words in the picker are
  // exactly the words that will appear on the CV.
  const levelOptions = [
    { value: '', label: t('noLevel') },
    ...(kind === 'skills'
      ? SKILL_LEVELS.map((level) => ({
          value: String(level),
          label: labels.skillLevels[level],
        }))
      : LANGUAGE_LEVELS.map((level) => ({
          value: level,
          label: labels.languageLevels[level],
        }))),
  ]

  function levelPatch(value: string): Partial<SkillItem> | Partial<LanguageItem> {
    if (!value) return { level: undefined }
    return kind === 'skills'
      ? { level: Number(value) as SkillLevel }
      : { level: value as LanguageLevel }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">{title}</h2>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-neutral-200 p-3 sm:grid-cols-[1fr_10rem_auto]"
            key={item.id}
          >
            <TextField
              label={t('name')}
              onChange={(name) => onUpdateItem(sectionId, item.id, { name })}
              value={item.name}
            />
            <SelectField
              label={t('level')}
              onChange={(value) => onUpdateItem(sectionId, item.id, levelPatch(value))}
              options={levelOptions}
              value={item.level === undefined ? '' : String(item.level)}
            />
            <button
              className="pb-2 text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
              onClick={() => onRemoveItem(sectionId, item.id)}
              type="button"
            >
              {t('remove')}
            </button>
          </div>
        ))}
      </div>

      <div>
        <button
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:border-neutral-900"
          onClick={() => onAddItem(sectionId)}
          type="button"
        >
          {t('add')}
        </button>
      </div>
    </section>
  )
}
