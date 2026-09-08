'use client'

import { useTranslations } from 'next-intl'

import { SelectField, TextField } from '@/components/editor/fields'
import type { CvLabels } from '@/lib/cv-labels'
import type { LanguageItem, LanguageLevel, SkillItem, SkillLevel } from '@/lib/schema/cv'

const iconButtonClass =
  'rounded-lg px-1.5 py-1 text-xs text-muted-foreground transition duration-150 hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

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
  onMoveItem,
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
  onMoveItem: (sectionId: string, from: number, to: number) => void
}) {
  const t = useTranslations('items')
  const tTimeline = useTranslations('timeline')

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
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>

      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div
            className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-border p-3 sm:grid-cols-[1fr_10rem_auto_auto]"
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
            {/* Ordering matters on a CV: your strongest skill goes first. */}
            <div className="flex items-center gap-1 pb-1">
              <button
                aria-label={tTimeline('moveUp')}
                className={iconButtonClass}
                disabled={index === 0}
                onClick={() => onMoveItem(sectionId, index, index - 1)}
                type="button"
              >
                ↑
              </button>
              <button
                aria-label={tTimeline('moveDown')}
                className={iconButtonClass}
                disabled={index === items.length - 1}
                onClick={() => onMoveItem(sectionId, index, index + 1)}
                type="button"
              >
                ↓
              </button>
            </div>

            <button
              className="pb-2 rounded text-sm font-medium text-muted-foreground underline-offset-2 transition hover:text-brand-strong hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
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
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          onClick={() => onAddItem(sectionId)}
          type="button"
        >
          {t('add')}
        </button>
      </div>
    </section>
  )
}
