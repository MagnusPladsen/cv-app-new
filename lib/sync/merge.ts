import type { CvDocument } from '@/lib/schema/cv'

import type { RemoteRecord, SyncPlan } from './types'

export type PlanInput = {
  local: CvDocument[]
  localTombstones: Record<string, number>
  remote: RemoteRecord[]
}

/**
 * Last-write-wins over `updatedAt`, with deletions treated as writes.
 *
 * The one rule worth stating out loud: a deletion is not special. It carries a
 * timestamp like any other edit and loses to anything newer. That is what
 * makes "deleted on my phone, then kept editing on my laptop" behave the way
 * a person expects, and it is why every branch below compares times rather
 * than checking presence.
 */
export function planSync({ local, localTombstones, remote }: PlanInput): SyncPlan {
  const plan: SyncPlan = {
    pull: [],
    push: [],
    deleteLocal: [],
    pushDeletes: [],
    settledTombstones: [],
  }

  const localById = new Map(local.map((doc) => [doc.id, doc]))
  const remoteById = new Map(remote.map((record) => [record.id, record]))

  for (const doc of local) {
    const record = remoteById.get(doc.id)
    if (!record) {
      plan.push.push(doc)
      continue
    }

    const remoteAt = record.deletedAt ?? record.updatedAt
    if (doc.updatedAt > remoteAt) {
      plan.push.push(doc)
    } else if (record.deletedAt !== null) {
      plan.deleteLocal.push(doc.id)
    } else if (record.updatedAt > doc.updatedAt && record.doc) {
      plan.pull.push(record.doc)
    }
    // Equal timestamps, or an unparseable remote payload: leave it alone.
  }

  for (const [id, deletedAt] of Object.entries(localTombstones)) {
    const record = remoteById.get(id)
    if (!record) {
      // Created and deleted before this account ever saw it.
      plan.settledTombstones.push(id)
      continue
    }
    if (record.deletedAt !== null) {
      plan.settledTombstones.push(id)
      continue
    }
    if (record.updatedAt > deletedAt) {
      if (record.doc) plan.pull.push(record.doc)
      plan.settledTombstones.push(id)
      continue
    }
    plan.pushDeletes.push(id)
  }

  for (const record of remote) {
    if (record.deletedAt !== null) continue
    if (!record.doc) continue
    if (localById.has(record.id)) continue
    if (record.id in localTombstones) continue
    plan.pull.push(record.doc)
  }

  return plan
}
