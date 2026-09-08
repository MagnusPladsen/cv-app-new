import type { CvDocument } from '@/lib/schema/cv'

import type { RemoteStore } from './remote'
import type { RemoteRecord } from './types'

export type FakeRemote = RemoteStore & {
  records: Map<string, RemoteRecord>
  /** Makes exactly the next call reject, for testing offline behaviour. */
  failNext(error?: Error): void
  calls: { list: number; upsert: number; markDeleted: number }
}

/**
 * An in-memory stand-in for the Supabase remote, mirroring its observable
 * behaviour: an upsert clears a tombstone, and a delete keeps the row but
 * drops the payload. It lives beside the real one so the two stay honest
 * about the same contract.
 */
export function createFakeRemote(seed: RemoteRecord[] = []): FakeRemote {
  const records = new Map(seed.map((record) => [record.id, record]))
  const calls = { list: 0, upsert: 0, markDeleted: 0 }
  let pendingError: Error | null = null

  function checkFailure() {
    if (!pendingError) return
    const error = pendingError
    pendingError = null
    throw error
  }

  return {
    records,
    calls,
    failNext(error = new Error('network')) {
      pendingError = error
    },
    async list() {
      calls.list += 1
      checkFailure()
      return [...records.values()]
    },
    async upsert(documents: CvDocument[]) {
      calls.upsert += 1
      checkFailure()
      for (const doc of documents) {
        records.set(doc.id, { id: doc.id, updatedAt: doc.updatedAt, deletedAt: null, doc })
      }
    },
    async markDeleted(ids: string[], deletedAt: number) {
      calls.markDeleted += 1
      checkFailure()
      for (const id of ids) {
        const existing = records.get(id)
        records.set(id, {
          id,
          updatedAt: existing?.updatedAt ?? deletedAt,
          deletedAt,
          doc: null,
        })
      }
    },
  }
}
