import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useDocumentEditor } from '@/lib/hooks/use-document-editor'
import { cvDocumentSchema } from '@/lib/schema/cv'
import { createDocumentsStore } from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

function setup() {
  const store = createDocumentsStore({ storage: memoryStorage() })
  const id = store.getState().createDocument({ name: 'Test' })
  const view = renderHook(() => useDocumentEditor(id, store))
  return { store, id, view }
}

function sectionIdOf(document: ReturnType<typeof setup>['view']['result']['current']['document'], type: string) {
  return document!.sections.find((section) => section.type === type)!.id
}

describe('useDocumentEditor', () => {
  it('exposes the document', () => {
    const { view, id } = setup()
    expect(view.result.current.document?.id).toBe(id)
  })

  it('defaults the active section to the first one', () => {
    const { view } = setup()
    expect(view.result.current.activeSectionId).toBe(
      view.result.current.document!.sections[0]!.id,
    )
  })

  it('changes the active section', () => {
    const { view } = setup()
    const target = sectionIdOf(view.result.current.document, 'skills')
    act(() => view.result.current.setActiveSectionId(target))
    expect(view.result.current.activeSectionId).toBe(target)
  })

  it('toggles a section in the store', () => {
    const { view } = setup()
    const target = sectionIdOf(view.result.current.document, 'certifications')
    act(() => view.result.current.handlers.onToggleSection(target, true))
    expect(
      view.result.current.document!.sections.find((s) => s.id === target)?.enabled,
    ).toBe(true)
  })

  it('reorders sections', () => {
    const { view } = setup()
    const second = view.result.current.document!.sections[1]!.type
    act(() => view.result.current.handlers.onMoveSection(0, 1))
    expect(view.result.current.document!.sections[0]!.type).toBe(second)
  })

  it('adds an entry and keeps the document valid', () => {
    const { view } = setup()
    const target = sectionIdOf(view.result.current.document, 'experience')
    act(() => view.result.current.handlers.onAddEntry(target))

    const section = view.result.current.document!.sections.find((s) => s.id === target)!
    expect('entries' in section && section.entries).toHaveLength(1)
    expect(cvDocumentSchema.safeParse(view.result.current.document).success).toBe(true)
  })

  it('writes a string list', () => {
    const { view } = setup()
    const target = sectionIdOf(view.result.current.document, 'interests')
    act(() => view.result.current.handlers.onStringListChange(target, ['A', 'B']))

    const section = view.result.current.document!.sections.find((s) => s.id === target)!
    expect('items' in section && section.items).toEqual(['A', 'B'])
  })

  it('adds a custom section and focuses it', () => {
    const { view } = setup()
    act(() => view.result.current.handlers.onAddCustomSection())

    const last = view.result.current.document!.sections.at(-1)!
    expect(last.type).toBe('custom')
    expect(view.result.current.activeSectionId).toBe(last.id)
  })

  it('falls back to the first section when the active one is removed', () => {
    const { view } = setup()
    act(() => view.result.current.handlers.onAddCustomSection())
    const customId = view.result.current.activeSectionId!

    act(() => view.result.current.handlers.onRemoveSection(customId))
    expect(view.result.current.activeSectionId).toBe(
      view.result.current.document!.sections[0]!.id,
    )
  })

  it('updates the theme and the paper size', () => {
    const { view } = setup()
    act(() => view.result.current.handlers.onThemeChange({ accent: '#123456' }))
    act(() => view.result.current.handlers.onPaperChange('letter'))
    expect(view.result.current.document!.theme.accent).toBe('#123456')
    expect(view.result.current.document!.paper).toBe('letter')
  })

  it('is a safe no-op for an unknown document id', () => {
    const store = createDocumentsStore({ storage: memoryStorage() })
    const view = renderHook(() => useDocumentEditor('missing', store))

    expect(view.result.current.document).toBeUndefined()
    expect(view.result.current.activeSectionId).toBeUndefined()
    expect(() =>
      act(() => view.result.current.handlers.onToggleSection('nope', true)),
    ).not.toThrow()
  })
})
