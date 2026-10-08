import { describe, expect, it, vi } from 'vitest'

import { applySuggestion, currentValue } from '@/lib/ai/apply'
import type { Suggestion } from '@/lib/ai/suggestions'
import { createDemoDocument } from '@/lib/schema/demo'
import type { CvDocument, TimelineEntry } from '@/lib/schema/cv'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'

/** Only the four handlers a suggestion can reach. Nothing else is callable. */
const handlers = () => ({
  onSummaryChange: vi.fn(),
  onUpdateEntry: vi.fn(),
  onCoverLetterChange: vi.fn(),
  onPersonaliaChange: vi.fn(),
})

type Spies = ReturnType<typeof handlers>
const asHandlers = (spies: Spies) => spies as unknown as DocumentEditorHandlers

const firstExperience = (document: CvDocument) => {
  const section = document.sections.find((candidate) => candidate.type === 'experience')!
  const entry = (section as { entries: TimelineEntry[] }).entries[0]!
  return { sectionId: section.id, entry }
}

describe('applying a suggestion', () => {
  it('replaces the line the suggestion points at and leaves the others', () => {
    const document = createDemoDocument()
    const { sectionId, entry } = firstExperience(document)
    const lines = (entry.description ?? '').split('\n')
    const spies = handlers()

    const suggestion: Suggestion = {
      kind: 'bullet',
      sectionId,
      entryId: entry.id,
      index: 1,
      value: 'Kuttet lastetid med 42 prosent',
      why: 'Et tall slår en oppgave',
    }

    expect(currentValue(document, suggestion)).toBe(lines[1])
    expect(applySuggestion(document, suggestion, asHandlers(spies))).toBe(true)

    const patch = spies.onUpdateEntry.mock.calls[0]![2] as { description: string }
    const after = patch.description.split('\n')
    expect(after[1]).toBe('Kuttet lastetid med 42 prosent')
    expect(after[0]).toBe(lines[0])
    expect(after).toHaveLength(lines.length)
  })

  it('switches an entry to bullets, or the suggestion renders as a paragraph', () => {
    const document = createDemoDocument()
    const { sectionId, entry } = firstExperience(document)
    const spies = handlers()

    applySuggestion(
      document,
      { kind: 'bullet', sectionId, entryId: entry.id, index: 0, value: 'Ledet et team', why: '' },
      asHandlers(spies),
    )

    expect(spies.onUpdateEntry.mock.calls[0]![2]).toMatchObject({ descriptionMode: 'bullets' })
  })

  it('refuses a suggestion whose target has gone, changing nothing', () => {
    const document = createDemoDocument()
    const spies = handlers()
    const suggestion: Suggestion = {
      kind: 'summary',
      sectionId: 'deleted-while-the-answer-was-in-flight',
      value: 'Noe nytt',
      why: '',
    }

    expect(currentValue(document, suggestion)).toBeNull()
    expect(applySuggestion(document, suggestion, asHandlers(spies))).toBe(false)
    expect(spies.onSummaryChange).not.toHaveBeenCalled()
  })

  it('refuses a bullet index past the end of the text', () => {
    const document = createDemoDocument()
    const { sectionId, entry } = firstExperience(document)

    expect(
      currentValue(document, {
        kind: 'bullet',
        sectionId,
        entryId: entry.id,
        index: 40,
        value: 'x',
        why: '',
      }),
    ).toBeNull()
  })

  it('writes a cover-letter field and the title through the editor handlers', () => {
    const document = createDemoDocument()
    const spies = handlers()

    applySuggestion(
      document,
      { kind: 'coverLetter', field: 'body', value: 'Hei,\n\nJeg søker …', why: '' },
      asHandlers(spies),
    )
    applySuggestion(
      document,
      { kind: 'field', path: 'personalia.title', value: 'Teamleder', why: '' },
      asHandlers(spies),
    )

    expect(spies.onCoverLetterChange).toHaveBeenCalledWith({ body: 'Hei,\n\nJeg søker …' })
    expect(spies.onPersonaliaChange).toHaveBeenCalledWith({ title: 'Teamleder' })
  })
})
