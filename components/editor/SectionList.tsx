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
import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { sectionTitle } from '@/components/cv/sections'
import type { CvLabels } from '@/lib/cv-labels'
import type { Section } from '@/lib/schema/cv'

type SectionListProps = {
  sections: Section[]
  labels: CvLabels
  activeSectionId: string | undefined
  onSelect: (sectionId: string) => void
  onToggle: (sectionId: string, enabled: boolean) => void
  onMove: (from: number, to: number) => void
  onAddCustom: () => void
  onRemove: (sectionId: string) => void
}

const iconButtonClass =
  'rounded-lg px-1.5 py-1 text-xs text-muted-foreground transition duration-150 hover:bg-brand-soft hover:text-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

function SectionRow({
  section,
  title,
  index,
  count,
  isActive,
  onSelect,
  onToggle,
  onMove,
  onRemove,
}: {
  section: Section
  title: string
  index: number
  count: number
  isActive: boolean
  onSelect: SectionListProps['onSelect']
  onToggle: SectionListProps['onToggle']
  onMove: SectionListProps['onMove']
  onRemove: SectionListProps['onRemove']
}) {
  const t = useTranslations('sections')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  return (
    <li
      className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition ${
        isActive ? 'border-brand bg-brand-soft' : 'border-transparent hover:border-brand/30 hover:bg-brand-soft/50'
      } ${isDragging ? 'opacity-60' : ''}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        aria-label={t('reorder')}
        className="cursor-grab rounded-lg px-1 text-muted-foreground/70 hover:text-foreground"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>

      {/* Ticking a section is how people expect to say "I want this on my CV",
          and they then expect somewhere to write. Switching one on therefore
          opens it as well - otherwise a section could be enabled, visible in
          the list, and still look like it had no form anywhere. */}
      <input
        aria-label={section.enabled ? t('hide') : t('show')}
        checked={section.enabled}
        className="size-4 shrink-0 accent-brand"
        onChange={(event) => {
          onToggle(section.id, event.target.checked)
          if (event.target.checked) onSelect(section.id)
        }}
        type="checkbox"
      />

      {/* The row's own name is the way into that section's form, and nothing
          said so: the checkbox and the arrows read as the whole control, so
          the forms for work history, education, skills and languages looked
          absent rather than one click away. The pencil appears on hover and
          focus, and the label is always in the accessible name. */}
      <button
        aria-current={isActive ? 'true' : undefined}
        aria-label={`${t('edit')}: ${title}`}
        className={`group/edit flex flex-1 items-center gap-2 truncate rounded-lg px-1.5 py-1 text-left text-sm transition ${
          section.enabled ? 'text-foreground' : 'text-muted-foreground/70'
        } ${isActive ? 'font-semibold text-brand-strong' : 'hover:bg-brand-soft/70'}`}
        onClick={() => onSelect(section.id)}
        type="button"
      >
        <span className="flex-1 truncate">{title}</span>
        <Pencil
          aria-hidden="true"
          className={`size-3.5 shrink-0 transition ${
            isActive
              ? 'text-brand'
              : 'text-muted-foreground opacity-0 group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100'
          }`}
        />
      </button>

      <button
        aria-label={t('moveUp')}
        className={iconButtonClass}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        type="button"
      >
        <ChevronUp aria-hidden="true" className="size-4" />
      </button>
      <button
        aria-label={t('moveDown')}
        className={iconButtonClass}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        type="button"
      >
        <ChevronDown aria-hidden="true" className="size-4" />
      </button>

      {section.type === 'custom' ? (
        <button
          aria-label={t('remove')}
          className={iconButtonClass}
          onClick={() => onRemove(section.id)}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </li>
  )
}

export function SectionList({
  sections,
  labels,
  activeSectionId,
  onSelect,
  onToggle,
  onMove,
  onAddCustom,
  onRemove,
}: SectionListProps) {
  const t = useTranslations('sections')

  // Pointer for mouse and touch, keyboard so reordering is not pointer-only.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = sections.findIndex((section) => section.id === active.id)
    const to = sections.findIndex((section) => section.id === over.id)
    if (from >= 0 && to >= 0) onMove(from, to)
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t('title')}
      </h2>
      <p className="-mt-1 text-xs text-muted-foreground">{t('sectionsHint')}</p>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-0.5">
            {sections.map((section, index) => (
              <SectionRow
                count={sections.length}
                index={index}
                isActive={section.id === activeSectionId}
                key={section.id}
                onMove={onMove}
                onRemove={onRemove}
                onSelect={onSelect}
                onToggle={onToggle}
                section={section}
                title={sectionTitle(section, labels)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          onClick={onAddCustom}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('addCustom')}
        </button>
      </div>
    </section>
  )
}
