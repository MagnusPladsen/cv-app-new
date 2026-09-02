import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORY_GROUPING_MS, createDocumentsStore } from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

function deterministicDeps() {
  let counter = 0
  return { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 }
}

describe('documents history', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function store() {
    return createDocumentsStore({ storage: memoryStorage(), deps: deterministicDeps() })
  }

  it('exposes a temporal store', () => {
    const s = store()
    expect(s.temporal).toBeDefined()
    expect(typeof s.temporal.getState().undo).toBe('function')
  })

  it('records history for a create', () => {
    const s = store()
    s.getState().createDocument({ name: 'A' })
    expect(s.temporal.getState().pastStates.length).toBe(1)
  })

  it('undo removes the created document', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    s.temporal.getState().undo()
    expect(s.getState().documents[id]).toBeUndefined()
    expect(s.getState().order).toEqual([])
  })

  it('redo restores the undone document', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    s.temporal.getState().undo()
    s.temporal.getState().redo()
    expect(s.getState().documents[id]?.name).toBe('A')
  })

  it('groups a burst of edits into one undo step', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)

    const before = s.temporal.getState().pastStates.length
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'O'))
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ol'))
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ola'))

    expect(s.temporal.getState().pastStates.length).toBe(before + 1)
  })

  it('undoes an entire burst in one step', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)

    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'O'))
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ola'))

    s.temporal.getState().undo()
    expect(s.getState().documents[id]?.personalia.firstName).toBe('')
  })

  it('starts a new undo step once the grouping window elapses', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)

    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ola'))
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)
    s.getState().updateDocument(id, (draft) => void (draft.personalia.lastName = 'Nordmann'))

    s.temporal.getState().undo()
    expect(s.getState().documents[id]?.personalia.firstName).toBe('Ola')
    expect(s.getState().documents[id]?.personalia.lastName).toBe('')
  })
})
