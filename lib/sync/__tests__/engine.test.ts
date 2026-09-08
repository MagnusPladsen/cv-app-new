import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CvDocument } from '@/lib/schema/cv'
import { createDocumentsStore } from '@/lib/store/documents'
import { createSyncEngine } from '@/lib/sync/engine'
import { createFakeRemote } from '@/lib/sync/fake-remote'
import type { RemoteRecord, SyncStatus } from '@/lib/sync/types'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

let counter = 0
let clock = 1_000
const deps = { newId: () => `id-${(counter += 1)}`, now: () => clock }

function setup(seed: RemoteRecord[] = []) {
  const store = createDocumentsStore({ storage: memoryStorage(), deps })
  const remote = createFakeRemote(seed)
  const statuses: SyncStatus[] = []
  const engine = createSyncEngine({
    store,
    remote,
    now: () => clock,
    debounceMs: 50,
    onStatus: (status) => statuses.push(status),
  })
  return { store, remote, engine, statuses }
}

beforeEach(() => {
  clock = 1_000
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('the sync engine', () => {
  it('pushes everything local on the first sync', async () => {
    const { store, remote, engine } = setup()
    store.getState().createDocument()
    store.getState().createDocument()

    await engine.syncNow()

    expect(remote.records.size).toBe(2)
  })

  it('pulls what the account already holds', async () => {
    const source = createDocumentsStore({ storage: memoryStorage(), deps })
    const remoteId = source.getState().createDocument()
    const remoteDoc = source.getState().documents[remoteId] as CvDocument

    const { store, engine } = setup([
      { id: remoteId, updatedAt: remoteDoc.updatedAt, deletedAt: null, doc: remoteDoc },
    ])

    await engine.syncNow()

    expect(store.getState().documents[remoteId]).toBeDefined()
    expect(store.getState().order).toContain(remoteId)
  })

  it('pushes a local delete and then forgets the tombstone', async () => {
    const { store, remote, engine } = setup()
    const id = store.getState().createDocument()
    await engine.syncNow()

    clock += 1_000
    store.getState().deleteDocument(id)
    await engine.syncNow()

    expect(remote.records.get(id)?.deletedAt).toBe(clock)
    expect(store.getState().tombstones).toEqual({})
  })

  it('debounces a burst of edits into one push', async () => {
    const { store, remote, engine } = setup()
    const id = store.getState().createDocument()
    await engine.syncNow()
    const before = remote.calls.upsert

    for (let i = 0; i < 5; i += 1) {
      clock += 10
      store.getState().renameDocument(id, `name ${i}`)
    }
    await vi.advanceTimersByTimeAsync(60)

    expect(remote.calls.upsert - before).toBe(1)
    expect(remote.records.get(id)?.doc?.name).toBe('name 4')
  })

  it('reports an error on failure and recovers on the next sync', async () => {
    const { store, remote, engine, statuses } = setup()
    store.getState().createDocument()
    remote.failNext()

    await engine.syncNow()
    expect(statuses).toContain('error')
    expect(remote.records.size).toBe(0)

    await engine.syncNow()
    expect(statuses.at(-1)).toBe('idle')
    expect(remote.records.size).toBe(1)
  })

  it('distinguishes being offline from the server refusing', async () => {
    const { store, remote, engine, statuses } = setup()
    store.getState().createDocument()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    remote.failNext()

    await engine.syncNow()

    expect(statuses).toContain('offline')
    expect(statuses).not.toContain('error')
  })

  it('stops listening after stop(), so a signed-out store never pushes', async () => {
    const { store, remote, engine } = setup()
    await engine.syncNow()
    engine.stop()

    store.getState().createDocument()
    await vi.advanceTimersByTimeAsync(200)

    expect(remote.calls.upsert).toBe(0)
    expect(remote.records.size).toBe(0)
  })

  it('runs one sync at a time rather than letting two interleave', async () => {
    const { store, remote, engine } = setup()
    store.getState().createDocument()

    await Promise.all([engine.syncNow(), engine.syncNow(), engine.syncNow()])

    expect(remote.calls.list).toBe(1)
  })
})
