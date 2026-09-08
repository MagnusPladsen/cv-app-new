import { describe, expect, it } from 'vitest'

import type { CvDocument } from '@/lib/schema/cv'
import { createFakeRemote } from '@/lib/sync/fake-remote'

const doc = (id: string, updatedAt: number) =>
  ({ id, updatedAt, name: id }) as unknown as CvDocument

describe('the fake remote', () => {
  it('round-trips an upsert', async () => {
    const remote = createFakeRemote()
    await remote.upsert([doc('a', 5)])
    expect(await remote.list()).toEqual([
      { id: 'a', updatedAt: 5, deletedAt: null, doc: doc('a', 5) },
    ])
  })

  it('keeps a deleted row as a tombstone with no payload', async () => {
    const remote = createFakeRemote()
    await remote.upsert([doc('a', 5)])
    await remote.markDeleted(['a'], 7)
    expect(await remote.list()).toEqual([{ id: 'a', updatedAt: 5, deletedAt: 7, doc: null }])
  })

  it('clears a tombstone when the document is upserted again', async () => {
    const remote = createFakeRemote()
    await remote.upsert([doc('a', 5)])
    await remote.markDeleted(['a'], 7)
    await remote.upsert([doc('a', 9)])
    expect((await remote.list())[0]?.deletedAt).toBeNull()
  })

  it('does nothing at all for an empty batch', async () => {
    const remote = createFakeRemote()
    await remote.upsert([])
    await remote.markDeleted([], 1)
    expect(remote.records.size).toBe(0)
  })

  it('fails exactly once after failNext', async () => {
    const remote = createFakeRemote()
    remote.failNext()
    await expect(remote.list()).rejects.toThrow('network')
    await expect(remote.list()).resolves.toEqual([])
  })
})
