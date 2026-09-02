import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { createDocumentsStore, selectOrderedDocuments } from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

/**
 * Guards the crash that shipped in Plan 2: reading selectOrderedDocuments
 * without useShallow produced "The result of getServerSnapshot should be cached
 * to avoid an infinite loop" in the browser, while every unit test passed.
 */
describe('useShallow over selectOrderedDocuments', () => {
  it('keeps the same array reference across re-renders', () => {
    const store = createDocumentsStore({ storage: memoryStorage() })
    store.getState().createDocument({ name: 'A' })

    const view = renderHook(() => useStore(store, useShallow(selectOrderedDocuments)))
    const first = view.result.current

    view.rerender()
    expect(view.result.current).toBe(first)
  })

  it('produces a new reference only when the documents actually change', () => {
    const store = createDocumentsStore({ storage: memoryStorage() })
    store.getState().createDocument({ name: 'A' })

    const view = renderHook(() => useStore(store, useShallow(selectOrderedDocuments)))
    const first = view.result.current

    act(() => void store.getState().createDocument({ name: 'B' }))

    expect(view.result.current).not.toBe(first)
    expect(view.result.current).toHaveLength(2)
  })
})
