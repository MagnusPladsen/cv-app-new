import { beforeEach, describe, expect, it } from 'vitest'
import {
  DOCUMENTS_STORAGE_KEY,
  createDocumentsStore,
  selectOrderedDocuments,
} from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

function deterministicDeps() {
  let counter = 0
  return { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 }
}

describe('documents store', () => {
  let storage: ReturnType<typeof memoryStorage>

  beforeEach(() => {
    storage = memoryStorage()
  })

  function store() {
    return createDocumentsStore({ storage, deps: deterministicDeps() })
  }

  it('starts empty', () => {
    const s = store()
    expect(s.getState().order).toEqual([])
    expect(selectOrderedDocuments(s.getState())).toEqual([])
  })

  it('creates a document and returns its id', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'Frontend' })
    expect(s.getState().documents[id]?.name).toBe('Frontend')
    expect(s.getState().order).toEqual([id])
  })

  it('puts the newest document first', () => {
    const s = store()
    const first = s.getState().createDocument({ name: 'A' })
    const second = s.getState().createDocument({ name: 'B' })
    expect(s.getState().order).toEqual([second, first])
  })

  it('updates a document through an immer recipe', () => {
    const s = store()
    const id = s.getState().createDocument({})
    s.getState().updateDocument(id, (draft) => {
      draft.personalia.firstName = 'Ola'
    })
    expect(s.getState().documents[id]?.personalia.firstName).toBe('Ola')
  })

  it('ignores an update for an unknown id', () => {
    const s = store()
    expect(() =>
      s.getState().updateDocument('missing', (draft) => {
        draft.name = 'x'
      }),
    ).not.toThrow()
  })

  it('duplicates a document without sharing state', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'Original' })
    s.getState().updateDocument(id, (draft) => {
      draft.personalia.firstName = 'Ola'
    })
    const copyId = s.getState().duplicateDocument(id, 'Copy')
    expect(copyId).toBeDefined()
    expect(copyId).not.toBe(id)
    expect(s.getState().documents[copyId!]?.name).toBe('Copy')
    expect(s.getState().documents[copyId!]?.personalia.firstName).toBe('Ola')

    s.getState().updateDocument(copyId!, (draft) => {
      draft.personalia.firstName = 'Kari'
    })
    expect(s.getState().documents[id]?.personalia.firstName).toBe('Ola')
  })

  it('deletes a document and removes it from the order', () => {
    const s = store()
    const id = s.getState().createDocument({})
    s.getState().deleteDocument(id)
    expect(s.getState().documents[id]).toBeUndefined()
    expect(s.getState().order).toEqual([])
  })

  it('renames a document', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'Old' })
    s.getState().renameDocument(id, 'New')
    expect(s.getState().documents[id]?.name).toBe('New')
  })

  it('persists to the namespaced storage key', () => {
    const s = store()
    s.getState().createDocument({ name: 'Persisted' })
    const raw = storage.map.get(DOCUMENTS_STORAGE_KEY)
    expect(raw).toBeDefined()
    expect(raw).toContain('Persisted')
  })

  it('rehydrates documents from storage', () => {
    const first = store()
    const id = first.getState().createDocument({ name: 'Persisted' })

    const second = createDocumentsStore({ storage, deps: deterministicDeps() })
    expect(second.getState().documents[id]?.name).toBe('Persisted')
  })

  it('drops a stored document that fails validation', () => {
    storage.map.set(
      DOCUMENTS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          documents: { broken: { schemaVersion: 1, id: 'broken' } },
          order: ['broken'],
        },
      }),
    )
    const s = createDocumentsStore({ storage, deps: deterministicDeps() })
    expect(s.getState().order).toEqual([])
    expect(s.getState().documents.broken).toBeUndefined()
  })

  it('imports a valid document and reports the new id', () => {
    const source = store()
    const id = source.getState().createDocument({ name: 'Imported' })
    const exported = JSON.parse(JSON.stringify(source.getState().documents[id]))

    const target = createDocumentsStore({ storage: memoryStorage(), deps: deterministicDeps() })
    const result = target.getState().importDocument(exported)
    expect(result.ok).toBe(true)
    if (result.ok) expect(target.getState().documents[result.id]?.name).toBe('Imported')
  })

  it('reports an error rather than throwing on a bad import', () => {
    const s = store()
    const result = s.getState().importDocument({ nope: true })
    expect(result.ok).toBe(false)
  })
})

describe('storage failures', () => {
  it('reports a write failure instead of throwing', () => {
    const errors: unknown[] = []
    const failing = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
    }

    const s = createDocumentsStore({
      storage: failing,
      deps: deterministicDeps(),
      onStorageError: (error) => errors.push(error),
    })

    const id = s.getState().createDocument({ name: 'Persisted' })

    expect(errors).toHaveLength(1)
    // The in-memory document survives, so the user does not lose their work
    // before they have a chance to export a backup.
    expect(s.getState().documents[id]?.name).toBe('Persisted')
  })
})

describe('selector stability', () => {
  it('returns a new array on every call, so consumers must memoise', () => {
    const s = createDocumentsStore({ storage: memoryStorage(), deps: deterministicDeps() })
    s.getState().createDocument({ name: 'A' })

    const first = selectOrderedDocuments(s.getState())
    const second = selectOrderedDocuments(s.getState())

    expect(first).toEqual(second)
    // Documented, not accidental: zustand v5 reads through useSyncExternalStore,
    // so a component calling this selector directly would re-render forever.
    // Every consumer wraps it in useShallow.
    expect(first).not.toBe(second)
  })
})
