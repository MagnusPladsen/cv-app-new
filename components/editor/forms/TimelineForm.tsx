'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslations } from 'next-intl'

import { TextAreaField, TextField } from '@/components/editor/fields'
import type { TimelineEntry } from '@/lib/schema/cv'

type TimelineFormProps = {
  sectionId: string
  title: string
  entries: TimelineEntry[]
  onAddEntry: (sectionId: string) => void
  onUpdateEntry: (sectionId: string, entryId: string, patch: Partial<TimelineEntry>) => void
  onRemoveEntry: (sectionId: string, entryId: string) => void
  onMoveEntry: (sectionId: string, from: number, to: number) => void
}

const iconButtonClass =
  'rounded-lg px-1.5 py-1 text-xs text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

function EntryCard({
  entry,
  index,
  count,
  sectionId,
  onUpdateEntry,
  onRemoveEntry,
  onMoveEntry,
}: {
  entry: TimelineEntry
  index: number
  count: number
  sectionId: string
  onUpdateEntry: TimelineFormProps['onUpdateEntry']
  onRemoveEntry: TimelineFormProps['onRemoveEntry']
  onMoveEntry: TimelineFormProps['onMoveEntry']
}) {
  const t = useTranslations('timeline')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  })

  const update = (patch: Partial<TimelineEntry>) => onUpdateEntry(sectionId, entry.id, patch)

  return (
    <fieldset
      className={`flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 ${
        isDragging ? 'opacity-60' : ''
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <legend className="sr-only">{entry.role || t('title')}</legend>

      <div className="flex items-center justify-end gap-1">
        <button
          aria-label={t('reorder')}
          className="mr-auto cursor-grab rounded-lg px-1 text-neutral-400 hover:text-neutral-700"
          type="button"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          aria-label={t('moveUp')}
          className={iconButtonClass}
          disabled={index === 0}
          onClick={() => onMoveEntry(sectionId, index, index - 1)}
          type="button"
        >
          ↑
        </button>
        <button
          aria-label={t('moveDown')}
          className={iconButtonClass}
          disabled={index === count - 1}
          onClick={() => onMoveEntry(sectionId, index, index + 1)}
          type="button"
        >
          ↓
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label={t('role')}
          onChange={(role) => update({ role })}
          value={entry.role}
        />
        <TextField
          label={t('organisation')}
          onChange={(organisation) => update({ organisation })}
          value={entry.organisation}
        />
        <TextField
          label={t('location')}
          onChange={(location) => update({ location })}
          value={entry.location ?? ''}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t('from')}
            onChange={(from) => update({ from })}
            type="month"
            value={entry.from}
          />
          <TextField
            disabled={entry.current}
            label={t('to')}
            onChange={(to) => update({ to })}
            type="month"
            value={entry.to}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          checked={entry.current}
          onChange={(event) =>
            update({
              current: event.target.checked,
              ...(event.target.checked ? { to: '' } : {}),
            })
          }
          type="checkbox"
        />
        {t('current')}
      </label>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-neutral-600">
          {(['bullets', 'prose'] as const).map((mode) => (
            <label className="flex items-center gap-1.5" key={mode}>
              <input
                checked={entry.descriptionMode === mode}
                name={`description-mode-${entry.id}`}
                onChange={() => update({ descriptionMode: mode })}
                type="radio"
              />
              {mode === 'bullets' ? t('modeBullets') : t('modeProse')}
            </label>
          ))}
        </div>
        <TextAreaField
          hint={t('descriptionHint')}
          label={t('description')}
          onChange={(description) => update({ description })}
          value={entry.description ?? ''}
        />
      </div>

      <div className="flex justify-end">
        <button
          className="text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          onClick={() => onRemoveEntry(sectionId, entry.id)}
          type="button"
        >
          {t('remove')}
        </button>
      </div>
    </fieldset>
  )
}

export function TimelineForm({
  sectionId,
  title,
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onMoveEntry,
}: TimelineFormProps) {
  const t = useTranslations('timeline')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = entries.findIndex((entry) => entry.id === active.id)
    const to = entries.findIndex((entry) => entry.id === over.id)
    if (from >= 0 && to >= 0) onMoveEntry(sectionId, from, to)
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">{title}</h2>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext
          items={entries.map((entry) => entry.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-4">
            {entries.map((entry, index) => (
              <EntryCard
                count={entries.length}
                entry={entry}
                index={index}
                key={entry.id}
                onMoveEntry={onMoveEntry}
                onRemoveEntry={onRemoveEntry}
                onUpdateEntry={onUpdateEntry}
                sectionId={sectionId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div>
        <button
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:border-neutral-900"
          onClick={() => onAddEntry(sectionId)}
          type="button"
        >
          {t('add')}
        </button>
      </div>
    </section>
  )
}
