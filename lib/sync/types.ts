import type { CvDocument } from '@/lib/schema/cv'

/**
 * One row of cv_documents, already validated. `doc` is null for a deleted row
 * and for a row whose payload no longer parses against the current schema.
 */
export type RemoteRecord = {
  id: string
  updatedAt: number
  deletedAt: number | null
  doc: CvDocument | null
}

export type SyncPlan = {
  pull: CvDocument[]
  push: CvDocument[]
  deleteLocal: string[]
  pushDeletes: string[]
  /** Local tombstones the server already agrees with; safe to forget. */
  settledTombstones: string[]
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error'
