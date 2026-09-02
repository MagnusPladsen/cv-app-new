# CVApp Editor and Design System Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Plan 1 vertical slice into a complete editor — every section type editable, sections and entries reorderable, a design panel for template, colour, typography, density and paper, a mobile bottom-sheet preview, photo upload, page-break guides, undo/redo controls, and a dashboard with duplicate, rename, delete and JSON backup.

**Architecture:** Document mutation lives in pure, unit-tested helpers over an immer draft (`lib/store/document-actions.ts`); routes bind them through `updateDocument`. Editor components stay presentational, taking data and callbacks as props, exactly as Plan 1 established. Section forms are chosen by a registry keyed on `section.type`, mirroring how `components/cv/sections/renderers.tsx` dispatches rendering.

**Tech Stack:** As Plan 1. New usage: `@dnd-kit/core` + `@dnd-kit/sortable` (already installed) for reordering, and the Canvas API for client-side photo compression.

**Spec:** `docs/superpowers/specs/2026-09-02-cvapp-design.md`
**Predecessor:** `docs/superpowers/plans/2026-09-02-cvapp-foundation.md` (complete)

## Global Constraints

All of Plan 1's Global Constraints still apply in full. Re-read them in
`docs/superpowers/plans/2026-09-02-cvapp-foundation.md`. The load-bearing ones
for this plan:

- **Package manager is Bun.** Never `npm` or `yarn`.
- **No Tailwind inside `components/cv/**`.** CV markup uses `public/cv/base.css`
  classes only. Editor chrome in `components/editor/**` uses Tailwind freely.
- **All CV geometry in `mm`.**
- **Label parity** between `lib/cv-labels/no.ts` and `en.ts`, and between
  `messages/no.json` and `messages/en.json`. Both are test-enforced.
- **Schema changes require a migration** and a test.
- **No third-party runtime requests.**

Additional constraints for this plan:

- **Reordering must be keyboard-operable.** dnd-kit's `KeyboardSensor` is
  mandatory, not optional. A pointer-only drag handle is an accessibility bug.
- **Every new UI string goes in both message catalogues.** The parity test fails
  otherwise, which is the point.
- **Photos are compressed before they reach the store.** Max 600 px on the long
  edge, JPEG quality 0.82. An uncompressed camera photo will blow the ~5 MB
  localStorage budget on its own.
- **Verification runs unpiped.** Run `bun run test`, `bun run typecheck` and
  `bun run lint` as bare commands so a non-zero exit is not swallowed by a pipe.

---

### Task 1: Document mutation helpers

**Files:**
- Create: `lib/store/document-actions.ts`
- Test: `lib/store/__tests__/document-actions.test.ts`

**Interfaces:**
- Consumes: `CvDocument`, `Section`, `SectionType`, `TimelineEntry`, `CertEntry`, `ReferenceEntry`, `SkillItem`, `LanguageItem` from `@/lib/schema/cv`; `createEmptySection` from `@/lib/schema/defaults`
- Produces — every function mutates an immer draft in place and returns `void` unless stated:
  - `moveArrayItem<T>(items: T[], from: number, to: number): void`
  - `findSection(doc, sectionId): Section | undefined`
  - `setSectionEnabled(doc, sectionId, enabled)`
  - `setSectionTitle(doc, sectionId, title: string)` — an empty or whitespace title clears the override rather than storing `""`
  - `moveSection(doc, from, to)`
  - `addCustomSection(doc, shape, newId): string` — returns the new section id
  - `removeSection(doc, sectionId)` — **only custom sections are removable**; built-ins are disabled instead
  - `setSummaryText(doc, sectionId, text)`
  - `addTimelineEntry(doc, sectionId, newId): string | undefined`
  - `updateTimelineEntry(doc, sectionId, entryId, patch: Partial<TimelineEntry>)`
  - `removeEntry(doc, sectionId, entryId)`
  - `moveEntry(doc, sectionId, from, to)`
  - `addCertEntry(doc, sectionId, newId)`, `updateCertEntry(doc, sectionId, entryId, patch)`
  - `addReferenceEntry(doc, sectionId, newId)`, `updateReferenceEntry(doc, sectionId, entryId, patch)`
  - `addLeveledItem(doc, sectionId, newId)`, `updateLeveledItem(doc, sectionId, itemId, patch)`, `removeItem(doc, sectionId, itemId)`, `moveItem(doc, sectionId, from, to)`
  - `setStringList(doc, sectionId, values: string[])` — backs interests, driving-licence classes and custom bullets
  - `setCustomText(doc, sectionId, text)`

Every mutator is a no-op when the section is missing or is the wrong type, so a
stale id from the UI can never throw.

- [ ] **Step 1: Write the failing test**

Create `lib/store/__tests__/document-actions.test.ts`. Use `createEmptyDocument`
with deterministic deps (see `lib/schema/__tests__/defaults.test.ts` for the
exact helper) and a `let counter` id factory.

```ts
import { describe, expect, it } from 'vitest'
import { cvDocumentSchema, type CvDocument } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import {
  addCustomSection,
  addLeveledItem,
  addTimelineEntry,
  findSection,
  moveArrayItem,
  moveEntry,
  moveSection,
  removeEntry,
  removeSection,
  setSectionEnabled,
  setSectionTitle,
  setStringList,
  setSummaryText,
  updateLeveledItem,
  updateTimelineEntry,
} from '@/lib/store/document-actions'

let counter = 0
const newId = () => `id-${++counter}`

function doc(): CvDocument {
  counter = 0
  return createEmptyDocument({}, { newId, now: () => 1_700_000_000_000 })
}

function sectionIdOf(document: CvDocument, type: string): string {
  return document.sections.find((section) => section.type === type)!.id
}

describe('moveArrayItem', () => {
  it('moves an item forward', () => {
    const items = ['a', 'b', 'c']
    moveArrayItem(items, 0, 2)
    expect(items).toEqual(['b', 'c', 'a'])
  })

  it('moves an item backward', () => {
    const items = ['a', 'b', 'c']
    moveArrayItem(items, 2, 0)
    expect(items).toEqual(['c', 'a', 'b'])
  })

  it('ignores an out-of-range index', () => {
    const items = ['a', 'b']
    moveArrayItem(items, 5, 0)
    moveArrayItem(items, 0, -1)
    expect(items).toEqual(['a', 'b'])
  })
})

describe('section mutators', () => {
  it('enables and disables a section', () => {
    const d = doc()
    const id = sectionIdOf(d, 'certifications')
    setSectionEnabled(d, id, true)
    expect(findSection(d, id)?.enabled).toBe(true)
    setSectionEnabled(d, id, false)
    expect(findSection(d, id)?.enabled).toBe(false)
  })

  it('sets and clears a title override', () => {
    const d = doc()
    const id = sectionIdOf(d, 'experience')
    setSectionTitle(d, id, 'Relevant erfaring')
    expect(findSection(d, id)?.titleOverride).toBe('Relevant erfaring')
    setSectionTitle(d, id, '   ')
    expect(findSection(d, id)?.titleOverride).toBeUndefined()
  })

  it('reorders sections', () => {
    const d = doc()
    const [first, second] = d.sections.map((section) => section.type)
    moveSection(d, 0, 1)
    expect(d.sections[0]?.type).toBe(second)
    expect(d.sections[1]?.type).toBe(first)
  })

  it('adds a custom section at the end and returns its id', () => {
    const d = doc()
    const id = addCustomSection(d, 'bullets', newId)
    expect(d.sections.at(-1)?.id).toBe(id)
    expect(findSection(d, id)).toMatchObject({ type: 'custom', shape: 'bullets' })
  })

  it('removes a custom section', () => {
    const d = doc()
    const id = addCustomSection(d, 'text', newId)
    removeSection(d, id)
    expect(findSection(d, id)).toBeUndefined()
  })

  it('refuses to remove a built-in section', () => {
    const d = doc()
    const id = sectionIdOf(d, 'experience')
    removeSection(d, id)
    expect(findSection(d, id)).toBeDefined()
  })

  it('keeps the document schema-valid after mutation', () => {
    const d = doc()
    addCustomSection(d, 'bullets', newId)
    moveSection(d, 0, 3)
    setSectionEnabled(d, sectionIdOf(d, 'interests'), true)
    expect(cvDocumentSchema.safeParse(d).success).toBe(true)
  })
})

describe('entry mutators', () => {
  it('adds, updates, reorders and removes timeline entries', () => {
    const d = doc()
    const id = sectionIdOf(d, 'experience')

    const first = addTimelineEntry(d, id, newId)!
    const second = addTimelineEntry(d, id, newId)!
    updateTimelineEntry(d, id, first, { role: 'Utvikler' })

    const section = findSection(d, id)!
    expect('entries' in section && section.entries).toHaveLength(2)

    moveEntry(d, id, 0, 1)
    const reordered = findSection(d, id)!
    expect('entries' in reordered && reordered.entries?.[0]?.id).toBe(second)

    removeEntry(d, id, first)
    const after = findSection(d, id)!
    expect('entries' in after && after.entries).toHaveLength(1)
  })

  it('ignores a timeline mutation on a skills section', () => {
    const d = doc()
    const id = sectionIdOf(d, 'skills')
    expect(addTimelineEntry(d, id, newId)).toBeUndefined()
    expect(cvDocumentSchema.safeParse(d).success).toBe(true)
  })

  it('ignores a mutation for an unknown section id', () => {
    const d = doc()
    expect(() => updateTimelineEntry(d, 'nope', 'nope', { role: 'x' })).not.toThrow()
    expect(() => removeEntry(d, 'nope', 'nope')).not.toThrow()
  })
})

describe('item mutators', () => {
  it('adds and updates a skill with a numeric level', () => {
    const d = doc()
    const id = sectionIdOf(d, 'skills')
    const itemId = addLeveledItem(d, id, newId)!
    updateLeveledItem(d, id, itemId, { name: 'TypeScript', level: 4 })

    const section = findSection(d, id)!
    expect('items' in section && section.items[0]).toMatchObject({
      name: 'TypeScript',
      level: 4,
    })
  })

  it('adds and updates a language with a CEFR level', () => {
    const d = doc()
    const id = sectionIdOf(d, 'languages')
    const itemId = addLeveledItem(d, id, newId)!
    updateLeveledItem(d, id, itemId, { name: 'Norsk', level: 'native' })
    expect(cvDocumentSchema.safeParse(d).success).toBe(true)
  })
})

describe('string list mutators', () => {
  it('sets interests', () => {
    const d = doc()
    const id = sectionIdOf(d, 'interests')
    setStringList(d, id, ['Klatring', 'Fotografi'])
    const section = findSection(d, id)!
    expect('items' in section && section.items).toEqual(['Klatring', 'Fotografi'])
  })

  it('sets driving licence classes', () => {
    const d = doc()
    const id = sectionIdOf(d, 'drivingLicence')
    setStringList(d, id, ['B', 'BE'])
    const section = findSection(d, id)!
    expect('classes' in section && section.classes).toEqual(['B', 'BE'])
  })

  it('sets summary text', () => {
    const d = doc()
    const id = sectionIdOf(d, 'summary')
    setSummaryText(d, id, 'Hei.')
    const section = findSection(d, id)!
    expect('text' in section && section.text).toBe('Hei.')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/store/__tests__/document-actions.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/store/document-actions"`.

- [ ] **Step 3: Write the implementation**

Create `lib/store/document-actions.ts`. Structure it as: array helper, section
lookup, narrow type-guard accessors, then the mutators.

```ts
import type {
  CertEntry,
  CvDocument,
  LanguageItem,
  ReferenceEntry,
  Section,
  SkillItem,
  TimelineEntry,
} from '@/lib/schema/cv'
import { createEmptySection } from '@/lib/schema/defaults'

export type IdFactory = () => string

export function moveArrayItem<T>(items: T[], from: number, to: number): void {
  if (from === to) return
  if (from < 0 || from >= items.length) return
  if (to < 0 || to >= items.length) return
  const [moved] = items.splice(from, 1)
  if (moved !== undefined) items.splice(to, 0, moved)
}

export function findSection(doc: CvDocument, sectionId: string): Section | undefined {
  return doc.sections.find((section) => section.id === sectionId)
}

/** Sections whose payload is a TimelineEntry[]. `custom` qualifies only in `entries` shape. */
function timelineEntriesOf(section: Section | undefined): TimelineEntry[] | undefined {
  if (!section) return undefined
  switch (section.type) {
    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteering':
    case 'courses':
      return section.entries
    case 'custom':
      return section.shape === 'entries' ? (section.entries ??= []) : undefined
    default:
      return undefined
  }
}

function certEntriesOf(section: Section | undefined): CertEntry[] | undefined {
  return section?.type === 'certifications' ? section.entries : undefined
}

function referenceEntriesOf(section: Section | undefined): ReferenceEntry[] | undefined {
  return section?.type === 'references' ? section.entries : undefined
}

function leveledItemsOf(
  section: Section | undefined,
): SkillItem[] | LanguageItem[] | undefined {
  if (section?.type === 'skills') return section.items
  if (section?.type === 'languages') return section.items
  return undefined
}

export function setSectionEnabled(doc: CvDocument, sectionId: string, enabled: boolean): void {
  const section = findSection(doc, sectionId)
  if (section) section.enabled = enabled
}

export function setSectionTitle(doc: CvDocument, sectionId: string, title: string): void {
  const section = findSection(doc, sectionId)
  if (!section) return
  const trimmed = title.trim()
  if (section.type === 'custom') {
    section.title = title
    return
  }
  if (trimmed) section.titleOverride = trimmed
  else delete section.titleOverride
}

export function moveSection(doc: CvDocument, from: number, to: number): void {
  moveArrayItem(doc.sections, from, to)
}

export function addCustomSection(
  doc: CvDocument,
  shape: 'entries' | 'bullets' | 'text',
  newId: IdFactory,
): string {
  const section = createEmptySection('custom', { newId })
  if (section.type !== 'custom') throw new Error('createEmptySection returned the wrong type')
  section.shape = shape
  if (shape === 'entries') section.entries = []
  if (shape === 'bullets') section.bullets = []
  if (shape === 'text') section.text = ''
  doc.sections.push(section)
  return section.id
}

/** Built-in sections are permanent; disabling is how you hide them. */
export function removeSection(doc: CvDocument, sectionId: string): void {
  const index = doc.sections.findIndex((section) => section.id === sectionId)
  if (index < 0) return
  if (doc.sections[index]?.type !== 'custom') return
  doc.sections.splice(index, 1)
}

export function setSummaryText(doc: CvDocument, sectionId: string, text: string): void {
  const section = findSection(doc, sectionId)
  if (section?.type === 'summary') section.text = text
}

export function setCustomText(doc: CvDocument, sectionId: string, text: string): void {
  const section = findSection(doc, sectionId)
  if (section?.type === 'custom') section.text = text
}

export function addTimelineEntry(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const entries = timelineEntriesOf(findSection(doc, sectionId))
  if (!entries) return undefined
  const entry: TimelineEntry = {
    id: newId(),
    role: '',
    organisation: '',
    from: '',
    to: '',
    current: false,
    description: '',
    descriptionMode: 'bullets',
  }
  entries.push(entry)
  return entry.id
}

export function updateTimelineEntry(
  doc: CvDocument,
  sectionId: string,
  entryId: string,
  patch: Partial<TimelineEntry>,
): void {
  const entry = timelineEntriesOf(findSection(doc, sectionId))?.find((e) => e.id === entryId)
  if (entry) Object.assign(entry, patch)
}

export function addCertEntry(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const entries = certEntriesOf(findSection(doc, sectionId))
  if (!entries) return undefined
  const entry: CertEntry = { id: newId(), name: '', issuer: '', date: '' }
  entries.push(entry)
  return entry.id
}

export function updateCertEntry(
  doc: CvDocument,
  sectionId: string,
  entryId: string,
  patch: Partial<CertEntry>,
): void {
  const entry = certEntriesOf(findSection(doc, sectionId))?.find((e) => e.id === entryId)
  if (entry) Object.assign(entry, patch)
}

export function addReferenceEntry(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const entries = referenceEntriesOf(findSection(doc, sectionId))
  if (!entries) return undefined
  const entry: ReferenceEntry = {
    id: newId(),
    name: '',
    role: '',
    organisation: '',
    email: '',
    phone: '',
  }
  entries.push(entry)
  return entry.id
}

export function updateReferenceEntry(
  doc: CvDocument,
  sectionId: string,
  entryId: string,
  patch: Partial<ReferenceEntry>,
): void {
  const entry = referenceEntriesOf(findSection(doc, sectionId))?.find((e) => e.id === entryId)
  if (entry) Object.assign(entry, patch)
}

/** Works for every entry-bearing section, whatever the entry shape. */
export function removeEntry(doc: CvDocument, sectionId: string, entryId: string): void {
  const section = findSection(doc, sectionId)
  const entries =
    timelineEntriesOf(section) ?? certEntriesOf(section) ?? referenceEntriesOf(section)
  if (!entries) return
  const index = entries.findIndex((entry) => entry.id === entryId)
  if (index >= 0) entries.splice(index, 1)
}

export function moveEntry(doc: CvDocument, sectionId: string, from: number, to: number): void {
  const section = findSection(doc, sectionId)
  const entries =
    timelineEntriesOf(section) ?? certEntriesOf(section) ?? referenceEntriesOf(section)
  if (entries) moveArrayItem(entries, from, to)
}

export function addLeveledItem(
  doc: CvDocument,
  sectionId: string,
  newId: IdFactory,
): string | undefined {
  const section = findSection(doc, sectionId)
  if (section?.type !== 'skills' && section?.type !== 'languages') return undefined
  const id = newId()
  section.items.push({ id, name: '' })
  return id
}

export function updateLeveledItem(
  doc: CvDocument,
  sectionId: string,
  itemId: string,
  patch: Partial<SkillItem> | Partial<LanguageItem>,
): void {
  const items = leveledItemsOf(findSection(doc, sectionId))
  const item = items?.find((candidate) => candidate.id === itemId)
  if (item) Object.assign(item, patch)
}

export function removeItem(doc: CvDocument, sectionId: string, itemId: string): void {
  const items = leveledItemsOf(findSection(doc, sectionId))
  if (!items) return
  const index = items.findIndex((item) => item.id === itemId)
  if (index >= 0) items.splice(index, 1)
}

export function moveItem(doc: CvDocument, sectionId: string, from: number, to: number): void {
  const items = leveledItemsOf(findSection(doc, sectionId))
  if (items) moveArrayItem(items, from, to)
}

/** Backs interests, driving-licence classes and custom bullets. */
export function setStringList(doc: CvDocument, sectionId: string, values: string[]): void {
  const section = findSection(doc, sectionId)
  if (!section) return
  if (section.type === 'interests') section.items = values
  else if (section.type === 'drivingLicence') section.classes = values
  else if (section.type === 'custom' && section.shape === 'bullets') section.bullets = values
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test lib/store`
Expected: PASS — the Plan 1 store tests plus the new document-action tests.

- [ ] **Step 5: Verify types and lint**

Run: `bun run typecheck` then `bun run lint` (bare commands, not piped).
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/store
git commit -m "feat(store): add pure document mutation helpers for the editor"
```

---

### Task 2: Section list panel

**Files:**
- Create: `components/editor/SectionList.tsx`
- Create: `messages/no.json`, `messages/en.json` — add a `sections` namespace (modify)
- Test: `components/editor/__tests__/section-list.test.tsx`

**Interfaces:**
- Consumes: `Section` from `@/lib/schema/cv`; `CvLabels`, `getCvLabels` from `@/lib/cv-labels`; `sectionTitle` from `@/components/cv/sections`; dnd-kit
- Produces:
  - `SectionList({ sections, labels, activeSectionId, onSelect, onToggle, onMove, onAddCustom, onRemove })`
  - `onMove(from: number, to: number)` — index-based, matching `moveSection`

**Message keys to add** (both catalogues, same keys):
`sections.title`, `sections.addCustom`, `sections.remove`, `sections.reorder`,
`sections.show`, `sections.hide`, `sections.moveUp`, `sections.moveDown`.

Norwegian: "Seksjoner", "Legg til egen seksjon", "Fjern", "Endre rekkefølge",
"Vis", "Skjul", "Flytt opp", "Flytt ned".
English: "Sections", "Add custom section", "Remove", "Reorder", "Show", "Hide",
"Move up", "Move down".

**Accessibility requirement.** Each row carries a dnd-kit drag handle *and*
explicit "Move up" / "Move down" buttons. The buttons are the keyboard path and
are what the tests drive; they are not a fallback to be dropped later.

- [ ] **Step 1: Write the failing test**

Create `components/editor/__tests__/section-list.test.tsx`. Wrap in
`NextIntlClientProvider` exactly as `components/editor/__tests__/editor.test.tsx`
does.

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SectionList } from '@/components/editor/SectionList'
import { getCvLabels } from '@/lib/cv-labels'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

let counter = 0
const document = () =>
  createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function props(overrides = {}) {
  const doc = document()
  return {
    sections: doc.sections,
    labels: getCvLabels('no'),
    activeSectionId: doc.sections[0]!.id,
    onSelect: vi.fn(),
    onToggle: vi.fn(),
    onMove: vi.fn(),
    onAddCustom: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  }
}

describe('SectionList', () => {
  it('lists every section with its localized title', () => {
    wrap(<SectionList {...props()} />)
    expect(screen.getByText('Arbeidserfaring')).toBeInTheDocument()
    expect(screen.getByText('Førerkort')).toBeInTheDocument()
  })

  it('shows a title override in place of the label', () => {
    const p = props()
    p.sections = p.sections.map((section) =>
      section.type === 'experience'
        ? { ...section, titleOverride: 'Relevant erfaring' }
        : section,
    )
    wrap(<SectionList {...p} />)
    expect(screen.getByText('Relevant erfaring')).toBeInTheDocument()
    expect(screen.queryByText('Arbeidserfaring')).not.toBeInTheDocument()
  })

  it('reports a selection', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    await userEvent.click(screen.getByText('Utdanning'))
    const educationId = p.sections.find((s) => s.type === 'education')!.id
    expect(p.onSelect).toHaveBeenCalledWith(educationId)
  })

  it('toggles a section on', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const row = screen.getByText('Sertifiseringer').closest('li')!
    await userEvent.click(within(row).getByRole('checkbox'))
    const id = p.sections.find((s) => s.type === 'certifications')!.id
    expect(p.onToggle).toHaveBeenCalledWith(id, true)
  })

  it('moves a section down by keyboard', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const row = screen.getByText('Om meg').closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Flytt ned' }))
    expect(p.onMove).toHaveBeenCalledWith(0, 1)
  })

  it('moves a section up by keyboard', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const row = screen.getByText('Arbeidserfaring').closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Flytt opp' }))
    expect(p.onMove).toHaveBeenCalledWith(1, 0)
  })

  it('disables move up on the first row and move down on the last', () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const first = screen.getByText('Om meg').closest('li')!
    const last = screen.getByText('Referanser').closest('li')!
    expect(within(first).getByRole('button', { name: 'Flytt opp' })).toBeDisabled()
    expect(within(last).getByRole('button', { name: 'Flytt ned' })).toBeDisabled()
  })

  it('adds a custom section', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til egen seksjon' }))
    expect(p.onAddCustom).toHaveBeenCalledTimes(1)
  })

  it('offers remove only on custom sections', async () => {
    const p = props()
    const custom = {
      id: 'custom-1',
      type: 'custom' as const,
      enabled: true,
      title: 'Publikasjoner',
      shape: 'bullets' as const,
      bullets: [],
    }
    p.sections = [...p.sections, custom]
    wrap(<SectionList {...p} />)

    const builtIn = screen.getByText('Arbeidserfaring').closest('li')!
    expect(within(builtIn).queryByRole('button', { name: 'Fjern' })).toBeNull()

    const customRow = screen.getByText('Publikasjoner').closest('li')!
    await userEvent.click(within(customRow).getByRole('button', { name: 'Fjern' }))
    expect(p.onRemove).toHaveBeenCalledWith('custom-1')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test components/editor/__tests__/section-list.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/editor/SectionList"`.

- [ ] **Step 3: Add the message keys**

Add the `sections` namespace shown above to both `messages/no.json` and
`messages/en.json`. `bun run test i18n` enforces parity.

- [ ] **Step 4: Write the component**

Create `components/editor/SectionList.tsx` as a `'use client'` component.

Structure: a `<ul>` of `<li>` rows. Each row contains, in order — a dnd-kit
drag handle (`useSortable`, `attributes` and `listeners` spread onto a small
grip button), a checkbox bound to `section.enabled`, a button whose label is
`sectionTitle(section, labels)` and which calls `onSelect(section.id)`, then
"Flytt opp" / "Flytt ned" icon buttons, and — for `type === 'custom'` only — a
"Fjern" button.

Wrap the list in `DndContext` + `SortableContext` configured with
`PointerSensor` **and** `KeyboardSensor` (`sortableKeyboardCoordinates`), and
map `onDragEnd` to `onMove(oldIndex, newIndex)` by looking the ids up in
`sections`.

Mark the active row with `aria-current="true"` and a visible accent.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test components/editor` then `bun run test i18n`
Expected: PASS.

- [ ] **Step 6: Verify and commit**

Run `bun run typecheck` and `bun run lint` bare, then:

```bash
git add components/editor messages
git commit -m "feat(editor): add section list with toggles and keyboard reordering"
```

---

### Task 3: Section form registry and the simple forms

**Files:**
- Create: `components/editor/fields.tsx` — shared field primitives
- Create: `components/editor/forms/SummaryForm.tsx`
- Create: `components/editor/forms/StringListForm.tsx`
- Create: `components/editor/forms/CustomTextForm.tsx`
- Create: `components/editor/SectionEditor.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/editor/__tests__/simple-forms.test.tsx`

**Interfaces:**
- Produces:
  - `TextField({ label, value, onChange, type?, placeholder? })`
  - `TextAreaField({ label, value, onChange, rows?, hint? })`
  - `SelectField({ label, value, options, onChange })`
  - `SummaryForm({ section, onChange })` — `onChange(text: string)`
  - `StringListForm({ section, label, values, onChange })` — `onChange(values: string[])`, one line per value in a textarea
  - `CustomTextForm({ section, onChange })`
  - `SectionEditor({ section, labels, handlers })` — dispatches on `section.type` and returns `null` for a type with no form yet
- Note for Tasks 4-6: `SectionEditor` is the single dispatch point. Each later task adds one `case` and one form file; nothing else changes.

**Message keys to add:** `forms.summaryLabel`, `forms.summaryHint`,
`forms.interestsLabel`, `forms.interestsHint`, `forms.licenceLabel`,
`forms.licenceHint`, `forms.customTitle`, `forms.customText`,
`forms.customBullets`, `forms.onePerLine`.

Norwegian hints use "Én per linje."; English "One per line."

**Design note.** `StringListForm` edits a `string[]` through a textarea, one
value per line, because that is the fastest way to enter a list of short strings
on both desktop and mobile and it needs no add/remove buttons. Blank lines are
dropped on the way into the store, matching how `toBullets` treats descriptions.

- [ ] **Step 1: Write the failing test**

Create `components/editor/__tests__/simple-forms.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SectionEditor } from '@/components/editor/SectionEditor'
import { getCvLabels } from '@/lib/cv-labels'
import type { Section } from '@/lib/schema/cv'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function handlers() {
  return {
    onSummaryChange: vi.fn(),
    onStringListChange: vi.fn(),
    onCustomTextChange: vi.fn(),
    onAddEntry: vi.fn(),
    onUpdateEntry: vi.fn(),
    onRemoveEntry: vi.fn(),
    onMoveEntry: vi.fn(),
    onAddItem: vi.fn(),
    onUpdateItem: vi.fn(),
    onRemoveItem: vi.fn(),
    onAddCert: vi.fn(),
    onUpdateCert: vi.fn(),
    onAddReference: vi.fn(),
    onUpdateReference: vi.fn(),
  }
}

function draw(section: Section, h = handlers()) {
  wrap(<SectionEditor section={section} labels={getCvLabels('no')} handlers={h} />)
  return h
}

describe('summary form', () => {
  const section: Section = { id: 's', type: 'summary', enabled: true, text: 'Hei' }

  it('shows the current text', () => {
    draw(section)
    expect(screen.getByLabelText('Om meg')).toHaveValue('Hei')
  })

  it('reports edits', async () => {
    const h = draw(section)
    await userEvent.type(screen.getByLabelText('Om meg'), '!')
    expect(h.onSummaryChange).toHaveBeenCalledWith('s', 'Hei!')
  })
})

describe('interests form', () => {
  const section: Section = {
    id: 's',
    type: 'interests',
    enabled: true,
    items: ['Klatring', 'Fotografi'],
  }

  it('renders one line per value', () => {
    draw(section)
    expect(screen.getByLabelText('Interesser')).toHaveValue('Klatring\nFotografi')
  })

  it('splits lines back into a list and drops blanks', async () => {
    const h = draw(section)
    const field = screen.getByLabelText('Interesser')
    await userEvent.clear(field)
    await userEvent.type(field, 'Klatring{Enter}{Enter}Sykling')
    expect(h.onStringListChange).toHaveBeenLastCalledWith('s', ['Klatring', 'Sykling'])
  })
})

describe('driving licence form', () => {
  it('edits the classes as a list', () => {
    draw({ id: 's', type: 'drivingLicence', enabled: true, classes: ['B'] })
    expect(screen.getByLabelText('Førerkort')).toHaveValue('B')
  })
})

describe('custom sections', () => {
  it('edits a text-shaped custom section', async () => {
    const h = draw({
      id: 's',
      type: 'custom',
      enabled: true,
      title: 'Notat',
      shape: 'text',
      text: 'Hei',
    })
    await userEvent.type(screen.getByLabelText('Notat'), '!')
    expect(h.onCustomTextChange).toHaveBeenCalledWith('s', 'Hei!')
  })

  it('edits a bullets-shaped custom section as a list', async () => {
    const h = draw({
      id: 's',
      type: 'custom',
      enabled: true,
      title: 'Publikasjoner',
      shape: 'bullets',
      bullets: ['En artikkel'],
    })
    const field = screen.getByLabelText('Publikasjoner')
    await userEvent.type(field, '{Enter}En til')
    expect(h.onStringListChange).toHaveBeenLastCalledWith('s', ['En artikkel', 'En til'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test components/editor/__tests__/simple-forms.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/editor/SectionEditor"`.

- [ ] **Step 3: Add the message keys**

Add the `forms` namespace to both catalogues.

- [ ] **Step 4: Extract the shared field primitives**

Create `components/editor/fields.tsx`. Lift the input and textarea markup
currently duplicated in `components/editor/PersonaliaForm.tsx` and
`components/editor/ExperienceForm.tsx` into `TextField`, `TextAreaField` and
`SelectField`. Each renders a `<label>` wrapping its control so
`getByLabelText` resolves, and each takes `label`, `value` and `onChange`.

Then rewrite `PersonaliaForm` and `ExperienceForm` to use them. Their existing
tests must keep passing untouched — that is the check that the extraction is
behaviour-preserving.

- [ ] **Step 5: Write the simple forms and the dispatcher**

`SummaryForm` renders a `TextAreaField` labelled with
`sectionTitle(section, labels)`.

`StringListForm` renders a `TextAreaField` whose value is `values.join('\n')`
and whose `onChange` splits on `\n`, trims, drops blanks, and calls
`onChange(next)`.

`CustomTextForm` renders a `TextAreaField` labelled with the custom title.

`SectionEditor` switches on `section.type`:

```tsx
switch (section.type) {
  case 'summary':
    return <SummaryForm section={section} onChange={handlers.onSummaryChange} />
  case 'interests':
    return (
      <StringListForm
        label={sectionTitle(section, labels)}
        values={section.items}
        onChange={(values) => handlers.onStringListChange(section.id, values)}
      />
    )
  case 'drivingLicence':
    return (
      <StringListForm
        label={sectionTitle(section, labels)}
        values={section.classes}
        onChange={(values) => handlers.onStringListChange(section.id, values)}
      />
    )
  case 'custom':
    return section.shape === 'text' ? (
      <CustomTextForm section={section} onChange={handlers.onCustomTextChange} />
    ) : section.shape === 'bullets' ? (
      <StringListForm
        label={sectionTitle(section, labels)}
        values={section.bullets ?? []}
        onChange={(values) => handlers.onStringListChange(section.id, values)}
      />
    ) : null
  default:
    return null
}
```

Tasks 4-6 replace the `default` branch's `null` for their own types.

- [ ] **Step 6: Run the full suite**

Run: `bun run test`
Expected: PASS — including the untouched `PersonaliaForm` and `ExperienceForm`
tests, which is the proof the field extraction changed no behaviour.

- [ ] **Step 7: Verify and commit**

```bash
git add components/editor messages
git commit -m "feat(editor): add section form dispatcher and the simple section forms"
```

---

### Task 4: Timeline section form with entry reordering

**Files:**
- Create: `components/editor/forms/TimelineForm.tsx`
- Delete: `components/editor/ExperienceForm.tsx`
- Delete: `components/editor/__tests__/experience-form.test.tsx`
- Modify: `components/editor/SectionEditor.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/editor/__tests__/timeline-form.test.tsx`

**Interfaces:**
- Produces: `TimelineForm({ sectionId, title, entries, onAddEntry, onUpdateEntry, onRemoveEntry, onMoveEntry })`
- Removes: `ExperienceForm` — `TimelineForm` supersedes it for all five timeline types plus entry-shaped custom sections

**Why replace rather than keep both.** `ExperienceForm` is `TimelineForm` with a
hardcoded title and no reordering. Keeping both would mean two places to fix
every future entry-field change. The move is safe because Task 3 already routed
rendering through `SectionEditor`.

**Message keys:** move the existing `experience.*` namespace to `timeline.*`
and add `timeline.moveUp`, `timeline.moveDown`. Every existing `experience` key
keeps its text; only the namespace changes. `EditorSplit` and the editor route
must stop importing `ExperienceForm`.

- [ ] **Step 1: Write the failing test**

Create `components/editor/__tests__/timeline-form.test.tsx`. Start from
`components/editor/__tests__/experience-form.test.tsx` — every case there still
applies — retarget it at `TimelineForm`, pass `sectionId="s"` and
`title="Arbeidserfaring"`, and add:

```tsx
  it('renders the title it is given rather than a hardcoded one', () => {
    wrap(<TimelineForm {...props({ title: 'Utdanning' })} />)
    expect(screen.getByText('Utdanning')).toBeInTheDocument()
  })

  it('moves an entry down', async () => {
    const p = props({ entries: [entry, { ...entry, id: 'e2' }] })
    wrap(<TimelineForm {...p} />)
    const first = screen.getAllByRole('group')[0]!
    await userEvent.click(within(first).getByRole('button', { name: 'Flytt ned' }))
    expect(p.onMoveEntry).toHaveBeenCalledWith(0, 1)
  })

  it('disables move up on the first entry', () => {
    const p = props({ entries: [entry, { ...entry, id: 'e2' }] })
    wrap(<TimelineForm {...p} />)
    const first = screen.getAllByRole('group')[0]!
    expect(within(first).getByRole('button', { name: 'Flytt opp' })).toBeDisabled()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test components/editor/__tests__/timeline-form.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Rename the message namespace**

In both catalogues, rename `experience` to `timeline` and add `moveUp` /
`moveDown` ("Flytt opp" / "Flytt ned", "Move up" / "Move down").

- [ ] **Step 4: Write TimelineForm**

Copy `components/editor/ExperienceForm.tsx` to
`components/editor/forms/TimelineForm.tsx`, then: take `sectionId` and `title`
as props instead of translating a fixed heading; use the `fields.tsx` primitives
from Task 3; add "Flytt opp" / "Flytt ned" buttons per entry calling
`onMoveEntry(index, index ± 1)`, disabled at the ends; and wrap the entry list
in dnd-kit `DndContext`/`SortableContext` with `PointerSensor` and
`KeyboardSensor`, mapping `onDragEnd` to `onMoveEntry`.

Keep the per-entry bullets/prose radio group and the `descriptionHint` exactly
as they are — that behaviour is already specified and tested.

- [ ] **Step 5: Route the five timeline types plus entry-shaped custom**

In `SectionEditor`, replace the `default: return null` with cases for
`experience`, `education`, `projects`, `volunteering` and `courses`, all
rendering `TimelineForm` with `title={sectionTitle(section, labels)}` and
`entries={section.entries}`. Extend the `custom` branch so
`shape === 'entries'` renders `TimelineForm` with `section.entries ?? []`.

- [ ] **Step 6: Delete the superseded form**

```bash
rm components/editor/ExperienceForm.tsx components/editor/__tests__/experience-form.test.tsx
```

Remove the `ExperienceForm` import, the four experience props and the
`<ExperienceForm .../>` element from `components/editor/EditorSplit.tsx`, and
delete the now-unused `experienceEntries` derivation from
`app/[locale]/cv/[id]/page.tsx`. Task 7 rewires the route properly; until then
`EditorSplit` renders `PersonaliaForm` alone.

Update `components/editor/__tests__/editor.test.tsx` to drop the four experience
entries from `splitHandlers`.

- [ ] **Step 7: Run the full suite**

Run: `bun run test`, then `bun run typecheck` and `bun run lint` bare.
Expected: PASS with no dangling references.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(editor): generalise the experience form into a reorderable timeline form"
```

---

### Task 5: Skills and languages form

**Files:**
- Create: `components/editor/forms/LeveledItemsForm.tsx`
- Modify: `components/editor/SectionEditor.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/editor/__tests__/leveled-items-form.test.tsx`

**Interfaces:**
- Consumes: `SkillItem`, `LanguageItem`, `SkillLevel`, `LanguageLevel` from `@/lib/schema/cv`; `CvLabels` from `@/lib/cv-labels`
- Produces: `LeveledItemsForm({ sectionId, title, kind: 'skills' | 'languages', items, labels, onAddItem, onUpdateItem, onRemoveItem })`

**The level options come from the CV label dictionary**, not from a hardcoded
list, so the words shown in the picker are exactly the words that will appear on
the CV. Skills offer levels 1-5 from `labels.skillLevels`; languages offer the
seven CEFR steps from `labels.languageLevels`. Both offer a blank "no level"
option, because `level` is optional in the schema.

**Message keys:** `items.add`, `items.remove`, `items.name`, `items.level`,
`items.noLevel`.
Norwegian: "Legg til", "Fjern", "Navn", "Nivå", "Ingen".
English: "Add", "Remove", "Name", "Level", "None".

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LeveledItemsForm } from '@/components/editor/forms/LeveledItemsForm'
import { getCvLabels } from '@/lib/cv-labels'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function props(overrides = {}) {
  return {
    sectionId: 's',
    title: 'Ferdigheter',
    kind: 'skills' as const,
    items: [{ id: 'i1', name: 'TypeScript', level: 4 as const }],
    labels: getCvLabels('no'),
    onAddItem: vi.fn(),
    onUpdateItem: vi.fn(),
    onRemoveItem: vi.fn(),
    ...overrides,
  }
}

describe('LeveledItemsForm', () => {
  it('renders one row per item', () => {
    wrap(<LeveledItemsForm {...props()} />)
    expect(screen.getByDisplayValue('TypeScript')).toBeInTheDocument()
  })

  it('offers the five skill levels using the CV wording', () => {
    wrap(<LeveledItemsForm {...props()} />)
    const select = screen.getByLabelText('Nivå')
    expect(within(select).getByRole('option', { name: 'Avansert' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Ekspert' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Ingen' })).toBeInTheDocument()
  })

  it('offers the CEFR scale for languages', () => {
    wrap(
      <LeveledItemsForm
        {...props({
          kind: 'languages',
          title: 'Språk',
          items: [{ id: 'i1', name: 'Norsk', level: 'native' }],
        })}
      />,
    )
    const select = screen.getByLabelText('Nivå')
    expect(within(select).getByRole('option', { name: 'Morsmål' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'C1' })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: 'Avansert' })).toBeNull()
  })

  it('reports a name edit', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.type(screen.getByLabelText('Navn'), 'X')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { name: 'TypeScriptX' })
  })

  it('reports a numeric level for skills', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Nivå'), 'Ekspert')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { level: 5 })
  })

  it('reports a CEFR level for languages', async () => {
    const p = props({
      kind: 'languages',
      items: [{ id: 'i1', name: 'Norsk', level: 'b1' }],
    })
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Nivå'), 'C1')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { level: 'c1' })
  })

  it('clears the level when None is chosen', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Nivå'), 'Ingen')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { level: undefined })
  })

  it('adds and removes items', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til' }))
    expect(p.onAddItem).toHaveBeenCalledWith('s')
    await userEvent.click(screen.getByRole('button', { name: 'Fjern' }))
    expect(p.onRemoveItem).toHaveBeenCalledWith('s', 'i1')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test components/editor/__tests__/leveled-items-form.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the message keys, then write the form**

Each row is a `TextField` for the name, a `SelectField` for the level, and a
"Fjern" button. Build the option list from the labels:

```tsx
const options =
  kind === 'skills'
    ? ([1, 2, 3, 4, 5] as const).map((level) => ({
        value: String(level),
        label: labels.skillLevels[level],
      }))
    : (['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'] as const).map((level) => ({
        value: level,
        label: labels.languageLevels[level],
      }))
```

Prepend `{ value: '', label: t('noLevel') }`. On change, map `''` to
`undefined`, and for skills coerce with `Number(value) as SkillLevel`.

- [ ] **Step 4: Route skills and languages in SectionEditor**

Add `case 'skills'` and `case 'languages'`, passing `kind` and the section's
`items`.

- [ ] **Step 5: Run, verify, commit**

```bash
git add -A
git commit -m "feat(editor): add skills and languages form driven by the CV label scales"
```

---

### Task 6: Certifications and references forms

**Files:**
- Create: `components/editor/forms/CertificationsForm.tsx`
- Create: `components/editor/forms/ReferencesForm.tsx`
- Modify: `components/editor/SectionEditor.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/editor/__tests__/entry-forms.test.tsx`

**Interfaces:**
- Produces:
  - `CertificationsForm({ sectionId, title, entries, onAddEntry, onUpdateEntry, onRemoveEntry })`
  - `ReferencesForm({ sectionId, title, entries, onAddEntry, onUpdateEntry, onRemoveEntry })`

**Message keys:** `cert.name`, `cert.issuer`, `cert.date`, `cert.url`,
`reference.name`, `reference.role`, `reference.organisation`,
`reference.email`, `reference.phone`, `reference.onRequestHint`.

`reference.onRequestHint` (NO: "Uten referanser her skriver CV-en «Referanser
oppgis ved forespørsel».", EN: "With no referees listed, the CV prints
\"References available on request\".") is shown above the list. It tells the
user what the empty state actually does, which is otherwise invisible.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CertificationsForm } from '@/components/editor/forms/CertificationsForm'
import { ReferencesForm } from '@/components/editor/forms/ReferencesForm'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const handlers = () => ({
  onAddEntry: vi.fn(),
  onUpdateEntry: vi.fn(),
  onRemoveEntry: vi.fn(),
})

describe('CertificationsForm', () => {
  const entry = { id: 'c1', name: 'AWS SAA', issuer: 'Amazon', date: '2023-05' }

  it('shows the current values', () => {
    wrap(
      <CertificationsForm
        sectionId="s"
        title="Sertifiseringer"
        entries={[entry]}
        {...handlers()}
      />,
    )
    expect(screen.getByLabelText('Navn')).toHaveValue('AWS SAA')
    expect(screen.getByLabelText('Utsteder')).toHaveValue('Amazon')
    expect(screen.getByLabelText('Dato')).toHaveValue('2023-05')
  })

  it('reports an edit for the right entry', async () => {
    const h = handlers()
    wrap(
      <CertificationsForm sectionId="s" title="Sertifiseringer" entries={[entry]} {...h} />,
    )
    await userEvent.type(screen.getByLabelText('Utsteder'), 'X')
    expect(h.onUpdateEntry).toHaveBeenCalledWith('s', 'c1', { issuer: 'AmazonX' })
  })

  it('adds and removes', async () => {
    const h = handlers()
    wrap(<CertificationsForm sectionId="s" title="Sertifiseringer" entries={[entry]} {...h} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til' }))
    expect(h.onAddEntry).toHaveBeenCalledWith('s')
    await userEvent.click(screen.getByRole('button', { name: 'Fjern' }))
    expect(h.onRemoveEntry).toHaveBeenCalledWith('s', 'c1')
  })
})

describe('ReferencesForm', () => {
  const entry = {
    id: 'r1',
    name: 'Kari Nordmann',
    role: 'Teamleder',
    organisation: 'Acme AS',
    email: 'kari@acme.no',
    phone: '+47 900 00 000',
  }

  it('explains what an empty list prints on the CV', () => {
    wrap(<ReferencesForm sectionId="s" title="Referanser" entries={[]} {...handlers()} />)
    expect(
      screen.getByText(
        'Uten referanser her skriver CV-en «Referanser oppgis ved forespørsel».',
      ),
    ).toBeInTheDocument()
  })

  it('reports an edit for the right entry', async () => {
    const h = handlers()
    wrap(<ReferencesForm sectionId="s" title="Referanser" entries={[entry]} {...h} />)
    await userEvent.type(screen.getByLabelText('E-post'), 'X')
    expect(h.onUpdateEntry).toHaveBeenCalledWith('s', 'r1', { email: 'kari@acme.noX' })
  })
})
```

- [ ] **Step 2: Run to verify failure, add message keys, write both forms**

Both follow the `TimelineForm` card layout: a `<fieldset>` per entry using the
`fields.tsx` primitives, plus "Legg til" and "Fjern". Certifications use
`type="month"` for the date, matching `formatMonthYear`'s `"YYYY-MM"` contract.

- [ ] **Step 3: Route both types in SectionEditor, run, verify, commit**

```bash
git add -A
git commit -m "feat(editor): add certifications and references forms"
```

---

### Task 7: Rewire the editor around the section list

**Files:**
- Modify: `components/editor/EditorSplit.tsx`
- Modify: `app/[locale]/cv/[id]/page.tsx`
- Create: `lib/hooks/use-document-editor.ts`
- Test: `lib/hooks/__tests__/use-document-editor.test.ts`
- Modify: `components/editor/__tests__/editor.test.tsx`

**Interfaces:**
- Produces:
  - `useDocumentEditor(documentId): { document, activeSectionId, setActiveSectionId, handlers }` — binds every Task 1 mutator to `updateDocument`
  - `EditorSplit({ document, activeSectionId, onSelectSection, handlers })` — form column is now `SectionList` + `PersonaliaForm` + `SectionEditor`

**This is the integration task.** Tasks 2-6 built parts with no route wiring;
this connects them. `useDocumentEditor` is the single place that knows about the
store, keeping every component presentational.

- [ ] **Step 1: Write the failing hook test**

`lib/hooks/__tests__/use-document-editor.test.ts` drives the hook with
`renderHook` from `@testing-library/react` against a store created by
`createDocumentsStore` with memory storage (see
`lib/store/__tests__/documents.test.ts` for the helper), asserting that:

- `handlers.onToggleSection(id, true)` enables that section in the store
- `handlers.onMoveSection(0, 1)` reorders `document.sections`
- `handlers.onAddEntry(sectionId)` appends an entry and the document stays
  schema-valid
- `handlers.onStringListChange(sectionId, ['A', 'B'])` writes the list
- `handlers.onAddCustomSection('bullets')` appends a custom section and returns
  focus by setting `activeSectionId` to it
- an unknown `documentId` yields `document === undefined` and every handler is
  a safe no-op

To inject the test store, `useDocumentEditor` takes an optional second argument
`store: DocumentsStoreApi = useDocuments`.

- [ ] **Step 2: Write the hook**

Each handler wraps a Task 1 mutator:

```ts
const onToggleSection = useCallback(
  (sectionId: string, enabled: boolean) =>
    store.getState().updateDocument(documentId, (draft) =>
      setSectionEnabled(draft, sectionId, enabled),
    ),
  [documentId, store],
)
```

`onAddCustomSection` also calls `setActiveSectionId` with the id the mutator
returns, so a newly added section is immediately the one being edited.

- [ ] **Step 3: Rewire EditorSplit**

Form column becomes, top to bottom: the export button row, `SectionList`,
`PersonaliaForm`, then `SectionEditor` for `activeSectionId`. Preview column is
unchanged.

Update `components/editor/__tests__/editor.test.tsx`'s `splitHandlers` to the
new shape and add a case asserting that selecting a section in the list swaps
which form is rendered.

- [ ] **Step 4: Simplify the route**

`app/[locale]/cv/[id]/page.tsx` reduces to: call `useDocumentEditor(id)`, guard
on `useHydrated()` and a missing document, then render `EditorSplit`. All the
ad-hoc `withExperience` handlers added in Plan 1 Task 17 are deleted — they are
now `useDocumentEditor`'s job.

- [ ] **Step 5: Run, verify, commit**

Run `bun run test`, `bun run typecheck`, `bun run lint` bare, then
`bun run build`.

```bash
git add -A
git commit -m "feat(editor): wire every section form through a single editor hook"
```

---

### Task 8: Photo upload with client-side compression

**Files:**
- Create: `lib/image/compress.ts`
- Create: `components/editor/PhotoField.tsx`
- Modify: `components/editor/PersonaliaForm.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `lib/image/__tests__/compress.test.ts`
- Test: `components/editor/__tests__/photo-field.test.tsx`

**Interfaces:**
- Produces:
  - `MAX_PHOTO_EDGE_PX = 600`, `PHOTO_QUALITY = 0.82`
  - `fitWithin(width, height, maxEdge): { width: number; height: number }` — pure, unit-tested
  - `compressImage(file: File, deps?): Promise<string>` — resolves a JPEG data URL
  - `PhotoField({ photo, showPhoto, onChange, onToggle, onRemove })`

**Why compression is not optional.** Photos are on by default, and localStorage
gives roughly 5 MB for *all* CVs combined. A single modern phone photo is 3-8 MB
before encoding and grows by a third again as base64. Without this step the
first user to add a photo hits `QuotaExceededError`.

**Testing strategy.** `fitWithin` is pure and gets full coverage. `compressImage`
takes injectable seams — `{ createImage, createCanvas }` — because happy-dom has
no real canvas; the test injects fakes and asserts the pipeline calls them with
the fitted dimensions and returns the encoded string.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import { MAX_PHOTO_EDGE_PX, compressImage, fitWithin } from '@/lib/image/compress'

describe('fitWithin', () => {
  it('leaves a small image alone', () => {
    expect(fitWithin(300, 200, 600)).toEqual({ width: 300, height: 200 })
  })

  it('scales a landscape image by its width', () => {
    expect(fitWithin(1200, 600, 600)).toEqual({ width: 600, height: 300 })
  })

  it('scales a portrait image by its height', () => {
    expect(fitWithin(600, 1200, 600)).toEqual({ width: 300, height: 600 })
  })

  it('rounds to whole pixels', () => {
    const { width, height } = fitWithin(1000, 333, 600)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('never returns a zero dimension', () => {
    expect(fitWithin(10_000, 1, 600).height).toBeGreaterThanOrEqual(1)
  })
})

describe('compressImage', () => {
  function fakes(naturalWidth: number, naturalHeight: number) {
    const drawImage = vi.fn()
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,COMPRESSED'),
    }
    return {
      drawImage,
      canvas,
      deps: {
        createImage: async () => ({ naturalWidth, naturalHeight }) as HTMLImageElement,
        createCanvas: () => canvas as unknown as HTMLCanvasElement,
      },
    }
  }

  it('returns a JPEG data URL', async () => {
    const { deps } = fakes(1200, 900)
    await expect(compressImage(new File([], 'a.png'), deps)).resolves.toBe(
      'data:image/jpeg;base64,COMPRESSED',
    )
  })

  it('sizes the canvas to the fitted dimensions', async () => {
    const { canvas, deps } = fakes(1200, 900)
    await compressImage(new File([], 'a.png'), deps)
    expect(canvas.width).toBe(MAX_PHOTO_EDGE_PX)
    expect(canvas.height).toBe(450)
  })

  it('encodes as JPEG at the configured quality', async () => {
    const { canvas, deps } = fakes(1200, 900)
    await compressImage(new File([], 'a.png'), deps)
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.82)
  })

  it('rejects a file that is not an image', async () => {
    const { deps } = fakes(10, 10)
    const notAnImage = new File([], 'a.pdf', { type: 'application/pdf' })
    await expect(compressImage(notAnImage, deps)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Write the implementation**

```ts
export const MAX_PHOTO_EDGE_PX = 600
export const PHOTO_QUALITY = 0.82

export function fitWithin(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const ratio = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}
```

`compressImage` reads the file with `FileReader`/`createImageBitmap` behind the
`createImage` seam, fits the dimensions, draws to the canvas and returns
`canvas.toDataURL('image/jpeg', PHOTO_QUALITY)`. Reject when
`!file.type.startsWith('image/')`.

- [ ] **Step 3: Write PhotoField and add message keys**

Keys: `photo.label`, `photo.upload`, `photo.replace`, `photo.remove`,
`photo.show`, `photo.tooLarge`, `photo.notAnImage`.

`PhotoField` renders a round preview when a photo exists, a file input, a
"Vis bilde" checkbox bound to `showPhoto`, and a remove button. Errors from
`compressImage` render as inline text, never a thrown exception.

Add it to the top of `PersonaliaForm`. Its test asserts: choosing a file calls
`onChange` with the compressed data URL (with `compressImage` injected), a
non-image file shows `photo.notAnImage` and does not call `onChange`, and the
checkbox calls `onToggle`.

- [ ] **Step 4: Guard the storage quota**

In `lib/store/documents.ts`, wrap the persist write so a `QuotaExceededError`
surfaces instead of failing silently: add an `onStorageError?: (error: unknown)
=> void` option to `DocumentsStoreOptions`, and pass a `storage` wrapper whose
`setItem` try/catches and calls it. Test that a storage whose `setItem` throws
invokes the callback and leaves the in-memory state intact.

- [ ] **Step 5: Run, verify, commit**

```bash
git add -A
git commit -m "feat(editor): add photo upload with client-side compression and a quota guard"
```

---

### Task 9: Design panel

**Files:**
- Create: `components/editor/DesignPanel.tsx`
- Create: `components/editor/ColourPicker.tsx`
- Modify: `components/editor/EditorSplit.tsx`, `lib/hooks/use-document-editor.ts`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/editor/__tests__/design-panel.test.tsx`

**Interfaces:**
- Consumes: `TEMPLATES`, `getTemplate` from `@/components/cv/templates`; `FONT_PAIRS` from `@/lib/theme/fonts`; `DENSITY_SCALE` from `@/lib/theme/tokens`; `PAPER` from `@/lib/print/paper`; `contrastRatio` from `@/lib/theme/contrast`
- Produces:
  - `DesignPanel({ theme, paper, onThemeChange, onPaperChange })` — `onThemeChange(patch: Partial<CvTheme>)`
  - `ColourPicker({ value, swatches, onChange })` — swatch row plus `<input type="color">`
  - `useDocumentEditor` gains `onThemeChange` and `onPaperChange`

**Message keys:** `design.title`, `design.template`, `design.accent`,
`design.custom`, `design.font`, `design.density`, `design.densityCompact`,
`design.densityNormal`, `design.densityRoomy`, `design.paper`,
`design.contrastWarning`.

**The contrast warning earns its place.** When the chosen accent drops below
4.5:1 against white, show `design.contrastWarning` — the accent is used for
section headings on a white page, so a pale pick is unreadable in print and the
user cannot tell from a small swatch.

- [ ] **Step 1: Write the failing test**

Assert: every template in `TEMPLATES` appears as an option; picking one calls
`onThemeChange({ templateId })`; the swatch row shows the *active template's*
swatches and clicking one calls `onThemeChange({ accent })`; the colour input
calls `onThemeChange({ accent })`; the font select lists every `FONT_PAIRS`
entry by `name`; the three density options map to the `Density` union; the paper
select offers A4 and Letter and calls `onPaperChange`; and a low-contrast accent
such as `#f5f5b0` renders the warning while `#1e3a8a` does not.

- [ ] **Step 2: Write the components, add message keys**

`ColourPicker` renders swatches as `<button type="button">` with
`aria-label={swatch}` and `aria-pressed`, plus `<input type="color">` labelled
`design.custom`.

- [ ] **Step 3: Mount the panel**

Add `DesignPanel` to `EditorSplit` above `SectionList`, collapsed behind a
disclosure on small screens.

- [ ] **Step 4: Run, verify, commit**

```bash
git add -A
git commit -m "feat(editor): add design panel for template, colour, type, density and paper"
```

---

### Task 10: Page-break guides and page count

**Files:**
- Create: `components/editor/PageGuides.tsx`
- Modify: `components/editor/PreviewPane.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/editor/__tests__/page-guides.test.tsx`

**Interfaces:**
- Consumes: `countPages`, `pageBreakOffsetsMm`, `mmToPx`, `DEFAULT_MARGIN_MM` from `@/lib/print/paper`
- Produces:
  - `PageGuides({ contentHeightMm, paper })` — absolutely positioned dashed rules
  - `PreviewPane` renders `PageGuides` and a page-count badge using the existing `editor.pageCount` plural message

**Measurement.** `PreviewPane` observes the `.cv-doc` node with the
`ResizeObserver` it already owns, converts `scrollHeight` through `pxToMm`, and
feeds that to `countPages`. The measurement must read the **unscaled** node, so
take it from the inner `.cv-doc` element rather than the scaled wrapper.

- [ ] **Step 1: Write the failing test**

Assert: one guide for a two-page height and none for a one-page height; each
guide is positioned at `mmToPx(offset)` from the top; the badge reads "1 side"
for one page and "2 sider" for two, proving the plural message is wired.

- [ ] **Step 2: Write, run, verify, commit**

```bash
git add -A
git commit -m "feat(editor): show page-break guides and a live page count"
```

---

### Task 11: Mobile layout with a bottom-sheet preview

**Files:**
- Create: `components/editor/PreviewSheet.tsx`
- Modify: `components/editor/EditorSplit.tsx`
- Test: `components/editor/__tests__/preview-sheet.test.tsx`

**Interfaces:**
- Produces: `PreviewSheet({ document, open, onOpenChange })`

**Behaviour.** Below `lg`, the preview column is hidden and a sticky bottom bar
appears with Preview / Design / Export. Preview opens a sheet containing the
same `PreviewPane`. The sheet closes on Escape and on backdrop click, traps
focus while open, and restores focus to the trigger on close.

**The export path must keep working from the sheet.** `EditorSplit` currently
finds the print node with `previewRef.current?.querySelector('.cv-doc')`. With
two possible preview mounts, exactly one must be in the DOM at a time — render
the desktop pane only at `lg` and up via a `useMediaQuery` hook rather than CSS
`hidden`, or the export will clone whichever node it finds first. Add a test
asserting exactly one `.cv-doc` exists in each layout.

- [ ] **Step 1: Write the failing test**

Assert: at mobile width only the sheet's preview exists once opened, and the
desktop pane is absent from the DOM; opening and closing toggles it; Escape
closes it; and `container.querySelectorAll('.cv-doc')` never exceeds 1.

- [ ] **Step 2: Write, run, verify, commit**

```bash
git add -A
git commit -m "feat(editor): add the mobile bottom-sheet preview"
```

---

### Task 12: Undo and redo controls

**Files:**
- Create: `components/editor/HistoryControls.tsx`
- Modify: `components/editor/EditorSplit.tsx`
- Test: `components/editor/__tests__/history-controls.test.tsx`

**Interfaces:**
- Consumes: `useDocumentsTemporal` from `@/lib/store/documents`
- Produces: `HistoryControls({ canUndo, canRedo, onUndo, onRedo })`, plus a `useHistoryShortcuts({ onUndo, onRedo })` hook binding Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z

The store side already exists and is tested (Plan 1, Task 7); this is the UI.
Buttons are disabled when `pastStates` / `futureStates` are empty.

- [ ] **Step 1: Write the failing test**

Assert: both buttons disabled with empty history; clicking calls the handlers;
Cmd+Z fires undo; Shift+Cmd+Z fires redo; and the shortcut does **not** fire
while focus is in a text input, so undo inside a field stays the browser's.

- [ ] **Step 2: Write, run, verify, commit**

```bash
git add -A
git commit -m "feat(editor): add undo and redo controls with keyboard shortcuts"
```

---

### Task 13: Dashboard actions and JSON backup

**Files:**
- Create: `lib/store/backup.ts`
- Create: `components/dashboard/CvCard.tsx`
- Create: `components/dashboard/BackupControls.tsx`
- Modify: `app/[locale]/cv/page.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `lib/store/__tests__/backup.test.ts`
- Test: `components/dashboard/__tests__/dashboard.test.tsx`

**Interfaces:**
- Produces:
  - `serialiseDocument(doc): string` — pretty-printed JSON
  - `backupFilename(doc, now): string` — e.g. `Ola_Nordmann_CV_2026-09-02.json`, reusing `buildPrintTitle`
  - `parseBackup(text): { ok: true; document } | { ok: false; error }` — JSON parse errors and schema errors both surface as `ok: false`
  - `CvCard({ document, onOpen, onDuplicate, onRename, onDelete, onExport })`
  - `BackupControls({ onImportFile })`

**Delete needs confirmation.** A CV lives only in this browser; there is no
server copy and no undo once the store has persisted the deletion. The card's
delete action asks first.

- [ ] **Step 1: Write the failing tests**

`backup.test.ts` asserts: `serialiseDocument` output round-trips through
`parseBackup`; `parseBackup('not json')` returns `ok: false` rather than
throwing; a structurally invalid document returns `ok: false` with the
`SchemaError`; and `backupFilename` includes both the name and the date.

`dashboard.test.tsx` asserts: a card shows the CV name and falls back to
`dashboard.untitled` when blank; duplicate, rename and export call their
handlers; delete asks for confirmation and only calls `onDelete` once
confirmed; and importing a file whose contents fail to parse shows an error
rather than creating a broken CV.

- [ ] **Step 2: Write the implementation**

`parseBackup` wraps `JSON.parse` in try/catch and delegates to
`safeMigrateDocument`, so a backup from an older schema version migrates on
import for free.

Export triggers a download with an object URL from a `Blob`; import reads the
file with `FileReader` and calls `importDocument` from the store.

- [ ] **Step 3: Run, verify, commit**

```bash
git add -A
git commit -m "feat(dashboard): add duplicate, rename, delete and JSON backup"
```

---

## What Plan 2 delivers

Every section type editable, sections and entries reorderable by pointer and by
keyboard, per-CV section renaming, custom sections, photo upload that cannot
blow the storage budget, full control of template, accent, typography, density
and paper, page-break guides with a live page count, a real mobile layout, undo
and redo, and CVs that can be duplicated, renamed, deleted and backed up to a
file.

## Deliberately left to Plan 3

The eight remaining templates and the four layout shells, the template gallery
and template-first onboarding, the landing page, the mobile export hint, the
remaining font pairings, and the vibrant playful chrome pass.

## Self-review

**Spec coverage.** Against the spec's Plan 2 scope: remaining section forms
(Tasks 3-6), drag reorder for sections and entries (Tasks 2, 4), section enable
and rename (Task 2), design panel (Task 9), mobile bottom sheet (Task 11), photo
with compression (Task 8), dashboard duplicate/rename/delete (Task 13), JSON
import and export (Task 13), page-break guides and counter (Task 10), undo/redo
UI (Task 12). Task 1 and Task 7 are the seams that make the rest testable.

**Type consistency.** Mutators take `(doc, sectionId, ...)` throughout, matching
Task 1's signatures. Handlers passed to forms take `(sectionId, ...)` so a form
never needs to know which document it belongs to. `SkillLevel` stays numeric and
`LanguageLevel` stays CEFR wherever levels appear, including the Task 5 picker.
`onThemeChange` takes `Partial<CvTheme>`, matching `themeSchema`.

**Known risk carried forward.** Task 11 introduces a second possible mount point
for `.cv-doc`, which would silently break export if both rendered at once. The
task specifies a test asserting at most one exists; do not skip it.
