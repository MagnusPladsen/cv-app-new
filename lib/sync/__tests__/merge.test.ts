import { describe, expect, it } from 'vitest'

import type { CvDocument } from '@/lib/schema/cv'
import { planSync } from '@/lib/sync/merge'
import type { RemoteRecord } from '@/lib/sync/types'

function doc(id: string, updatedAt: number): CvDocument {
  // Only the two fields the planner reads matter here.
  return { id, updatedAt, name: id } as unknown as CvDocument
}

function remote(id: string, updatedAt: number, deletedAt: number | null = null): RemoteRecord {
  return { id, updatedAt, deletedAt, doc: deletedAt === null ? doc(id, updatedAt) : null }
}

const empty = { local: [], localTombstones: {}, remote: [] }

describe('planSync', () => {
  it('does nothing when both sides are empty', () => {
    expect(planSync(empty)).toEqual({
      pull: [],
      push: [],
      deleteLocal: [],
      pushDeletes: [],
      settledTombstones: [],
    })
  })

  it('pushes a document the server has never seen', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)] })
    expect(plan.push.map((d) => d.id)).toEqual(['a'])
  })

  it('pulls a document this device has never seen', () => {
    const plan = planSync({ ...empty, remote: [remote('a', 5)] })
    expect(plan.pull.map((d) => d.id)).toEqual(['a'])
  })

  it('leaves an identical document alone', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [remote('a', 5)] })
    expect(plan.push).toEqual([])
    expect(plan.pull).toEqual([])
  })

  it('pushes when the local copy is newer', () => {
    const plan = planSync({ ...empty, local: [doc('a', 9)], remote: [remote('a', 5)] })
    expect(plan.push.map((d) => d.id)).toEqual(['a'])
    expect(plan.pull).toEqual([])
  })

  it('pulls when the remote copy is newer', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [remote('a', 9)] })
    expect(plan.pull.map((d) => d.id)).toEqual(['a'])
    expect(plan.push).toEqual([])
  })

  it('applies a remote deletion locally', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [remote('a', 5, 7)] })
    expect(plan.deleteLocal).toEqual(['a'])
    expect(plan.push).toEqual([])
  })

  it('keeps a local edit made after the remote deletion', () => {
    // Deleted on the phone, then edited on the laptop. The edit is the more
    // recent intent, so the CV comes back rather than vanishing mid-session.
    const plan = planSync({ ...empty, local: [doc('a', 9)], remote: [remote('a', 5, 7)] })
    expect(plan.push.map((d) => d.id)).toEqual(['a'])
    expect(plan.deleteLocal).toEqual([])
  })

  it('pushes a local deletion the server has not applied', () => {
    const plan = planSync({ ...empty, localTombstones: { a: 7 }, remote: [remote('a', 5)] })
    expect(plan.pushDeletes).toEqual(['a'])
  })

  it('resurrects when the remote edit is newer than the local deletion', () => {
    const plan = planSync({ ...empty, localTombstones: { a: 5 }, remote: [remote('a', 9)] })
    expect(plan.pull.map((d) => d.id)).toEqual(['a'])
    expect(plan.pushDeletes).toEqual([])
  })

  it('never pulls a document the server has also deleted', () => {
    const plan = planSync({ ...empty, localTombstones: { a: 5 }, remote: [remote('a', 5, 6)] })
    expect(plan.pull).toEqual([])
    expect(plan.settledTombstones).toEqual(['a'])
  })

  it('drops a tombstone for a document the server has never heard of', () => {
    // Created and deleted while signed out. Nothing to tell the server.
    const plan = planSync({ ...empty, localTombstones: { a: 5 } })
    expect(plan.pushDeletes).toEqual([])
    expect(plan.settledTombstones).toEqual(['a'])
  })

  it('ignores a remote row whose payload failed to parse', () => {
    // The remote store nulls out `doc` when the stored JSON no longer
    // validates. A corrupt row must not blank out a healthy local copy.
    const corrupt: RemoteRecord = { id: 'a', updatedAt: 99, deletedAt: null, doc: null }
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [corrupt] })
    expect(plan.pull).toEqual([])
    expect(plan.deleteLocal).toEqual([])
  })

  it('never pulls the same document twice', () => {
    // A tombstoned id that the server has since edited is reachable from two
    // branches; emitting it twice would double-insert it into `order`.
    const plan = planSync({ ...empty, localTombstones: { a: 5 }, remote: [remote('a', 9)] })
    expect(plan.pull).toHaveLength(1)
  })

  it('handles a realistic first sign-in: local work, plus another device already synced', () => {
    const plan = planSync({
      local: [doc('a', 10), doc('b', 20)],
      localTombstones: {},
      remote: [remote('b', 5), remote('c', 30)],
    })
    expect(plan.push.map((d) => d.id).sort()).toEqual(['a', 'b'])
    expect(plan.pull.map((d) => d.id)).toEqual(['c'])
  })
})
