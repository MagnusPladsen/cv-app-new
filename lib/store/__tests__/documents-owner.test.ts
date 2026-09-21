import { describe, expect, it } from 'vitest'

import { DOCUMENTS_STORAGE_KEY, createDocumentsStore } from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

let counter = 0
const deps = { newId: () => `id-${(counter += 1)}`, now: () => 1_000 }

describe('owner scoping', () => {
  it('claims anonymous documents for the user who signs in', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()

    expect(store.getState().adoptOwner('user-a')).toBe('claimed')
    expect(store.getState().ownerId).toBe('user-a')
    expect(Object.keys(store.getState().documents)).toHaveLength(1)
  })

  it('is idempotent for the same user', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()
    store.getState().adoptOwner('user-a')

    expect(store.getState().adoptOwner('user-a')).toBe('unchanged')
    expect(Object.keys(store.getState().documents)).toHaveLength(1)
  })

  it('drops the previous account entirely when a different user signs in', () => {
    // The leak this prevents: two people share a laptop, and the second one
    // signs in to find the first one's CVs sitting in their account.
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()
    store.getState().adoptOwner('user-a')

    expect(store.getState().adoptOwner('user-b')).toBe('switched')
    expect(store.getState().documents).toEqual({})
    expect(store.getState().order).toEqual([])
    expect(store.getState().tombstones).toEqual({})
  })

  it('clears synced documents on sign-out, since they live on the server now', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()
    store.getState().adoptOwner('user-a')

    store.getState().releaseOwner()

    expect(store.getState().ownerId).toBeNull()
    expect(store.getState().documents).toEqual({})
  })
})

describe('tombstones', () => {
  it('records a deletion so other devices do not resurrect it', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = store.getState().createDocument()

    store.getState().deleteDocument(id)

    expect(store.getState().tombstones[id]).toBe(1_000)
    expect(store.getState().documents[id]).toBeUndefined()
  })

  it('clears a tombstone when the same id comes back from the server', () => {
    // Only ever reached when the remote copy is newer than the delete; the
    // merge planner decides that, not the store.
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = store.getState().createDocument()
    const doc = store.getState().documents[id]!
    store.getState().deleteDocument(id)

    store.getState().applyRemote([doc])

    expect(store.getState().tombstones[id]).toBeUndefined()
    expect(store.getState().documents[id]).toBeDefined()
    expect(store.getState().order).toContain(id)
  })

  it('applies a remote deletion without leaving a tombstone behind', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = store.getState().createDocument()

    store.getState().applyRemoteDeletes([id])

    expect(store.getState().documents[id]).toBeUndefined()
    expect(store.getState().order).not.toContain(id)
    expect(store.getState().tombstones).toEqual({})
  })

  it('forgets tombstones once they are safely on the server', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = store.getState().createDocument()
    store.getState().deleteDocument(id)

    store.getState().forgetTombstones([id])

    expect(store.getState().tombstones).toEqual({})
  })
})

describe('persisted shape', () => {
  it('carries a v1 payload across the version bump instead of discarding it', () => {
    // zustand throws away the whole persisted state on a version bump when no
    // migrate function is provided. For this store that is every CV a
    // returning user has, so the migration is load-bearing. Building the
    // payload from a real document is the point: a hand-written stub would
    // fail schema validation and pass this test for the wrong reason.
    const source = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = source.getState().createDocument()
    source.getState().renameDocument(id, 'CV fra før innlogging')
    const doc = source.getState().documents[id]

    const storage = memoryStorage()
    storage.setItem(
      DOCUMENTS_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { documents: { [id]: doc }, order: [id] } }),
    )

    const store = createDocumentsStore({ storage, deps })

    expect(store.getState().documents[id]?.name).toBe('CV fra før innlogging')
    expect(store.getState().order).toEqual([id])
    expect(store.getState().ownerId).toBeNull()
    expect(store.getState().tombstones).toEqual({})
  })

  it('reads back an owner and its tombstones', () => {
    const storage = memoryStorage()
    storage.setItem(
      DOCUMENTS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: { documents: {}, order: [], ownerId: 'user-a', tombstones: { gone: 900 } },
      }),
    )

    const store = createDocumentsStore({ storage, deps })

    expect(store.getState().ownerId).toBe('user-a')
    expect(store.getState().tombstones).toEqual({ gone: 900 })
  })
})

describe('what a signed-in browser keeps', () => {
  const stored = (storage: ReturnType<typeof memoryStorage>) =>
    JSON.parse(storage.getItem(DOCUMENTS_STORAGE_KEY) ?? '{}').state ?? {}

  it('keeps nothing locally once the database has it all', () => {
    // Signing in moves the CVs to the account. Leaving a second copy in this
    // browser is a copy nobody asked for, on a machine that may be shared.
    const storage = memoryStorage()
    const store = createDocumentsStore({ storage, deps })
    const id = store.getState().createDocument()
    store.getState().adoptOwner('user-a')
    expect(Object.keys(stored(storage).documents)).toEqual([id])

    store.getState().markSynced()

    expect(stored(storage).documents).toEqual({})
    expect(stored(storage).order).toEqual([])
    // Still in the session, and still the user's.
    expect(Object.keys(store.getState().documents)).toEqual([id])
    expect(stored(storage).ownerId).toBe('user-a')
  })

  it('keeps an edit that has not reached the database yet', () => {
    const storage = memoryStorage()
    const store = createDocumentsStore({ storage, deps })
    const id = store.getState().createDocument()
    store.getState().adoptOwner('user-a')
    store.getState().markSynced()

    store.getState().renameDocument(id, 'Ikke lagret ennå')

    expect(stored(storage).documents[id]?.name).toBe('Ikke lagret ennå')
  })

  it('goes on keeping an anonymous browser’s CVs, which have nowhere else to be', () => {
    const storage = memoryStorage()
    const store = createDocumentsStore({ storage, deps })
    const id = store.getState().createDocument()
    store.getState().markSynced()

    expect(Object.keys(stored(storage).documents)).toEqual([id])
  })

  it('forgets what it knew about the server when somebody signs out', () => {
    const storage = memoryStorage()
    const store = createDocumentsStore({ storage, deps })
    store.getState().createDocument()
    store.getState().adoptOwner('user-a')
    store.getState().markSynced()

    store.getState().releaseOwner()

    expect(store.getState().documents).toEqual({})
    expect(stored(storage).documents).toEqual({})
    expect(stored(storage).ownerId).toBeNull()
  })
})
