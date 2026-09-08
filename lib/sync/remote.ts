import type { SupabaseClient } from '@supabase/supabase-js'

import type { CvDocument } from '@/lib/schema/cv'
import { safeMigrateDocument } from '@/lib/schema/migrations'

import type { RemoteRecord } from './types'

export type RemoteStore = {
  list(): Promise<RemoteRecord[]>
  upsert(documents: CvDocument[]): Promise<void>
  markDeleted(ids: string[], deletedAt: number): Promise<void>
}

const TABLE = 'cv_documents'

export function createSupabaseRemote(client: SupabaseClient, userId: string): RemoteStore {
  return {
    async list() {
      const { data, error } = await client
        .from(TABLE)
        .select('id, doc, updated_at, deleted_at')
        // RLS already scopes this, but saying it out loud keeps the query
        // honest if the policy is ever loosened.
        .eq('user_id', userId)

      if (error) throw error

      return (data ?? []).map((row): RemoteRecord => {
        if (row.deleted_at !== null) {
          return { id: row.id, updatedAt: row.updated_at, deletedAt: row.deleted_at, doc: null }
        }
        // A row written by an older release can hold an older schema. Run it
        // through the same migration path localStorage uses; a payload that
        // still fails becomes doc: null, which the planner leaves alone
        // rather than letting it overwrite a healthy local copy.
        const parsed = safeMigrateDocument(row.doc)
        return {
          id: row.id,
          updatedAt: row.updated_at,
          deletedAt: null,
          doc: parsed.ok ? parsed.document : null,
        }
      })
    },

    async upsert(documents) {
      if (documents.length === 0) return
      const { error } = await client.from(TABLE).upsert(
        documents.map((doc) => ({
          id: doc.id,
          user_id: userId,
          name: doc.name,
          doc,
          updated_at: doc.updatedAt,
          // Clears any tombstone. The planner only reaches here when the local
          // edit is newer than the deletion, which is exactly when the CV
          // should come back.
          deleted_at: null,
        })),
        { onConflict: 'id' },
      )
      if (error) throw error
    },

    async markDeleted(ids, deletedAt) {
      if (ids.length === 0) return
      // The row stays as a tombstone so other devices learn about the delete,
      // but the payload goes: a deleted CV should not sit in the database in
      // full. list() never reads a deleted row's doc, so this costs nothing.
      const { error } = await client
        .from(TABLE)
        .update({ deleted_at: deletedAt, doc: {}, name: '' })
        .in('id', ids)
      if (error) throw error
    },
  }
}
