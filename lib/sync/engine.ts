import type { DocumentsStoreApi } from '@/lib/store/documents'
import { selectOrderedDocuments } from '@/lib/store/documents'
import { debounceTrailing } from '@/lib/utils/debounce-trailing'

import { planSync } from './merge'
import type { RemoteStore } from './remote'
import type { SyncStatus } from './types'

export const SYNC_DEBOUNCE_MS = 2_000

export type SyncEngine = {
  syncNow(): Promise<void>
  stop(): void
}

export type SyncEngineOptions = {
  store: DocumentsStoreApi
  remote: RemoteStore
  now?: () => number
  debounceMs?: number
  onStatus?: (status: SyncStatus) => void
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function createSyncEngine({
  store,
  remote,
  now = () => Date.now(),
  debounceMs = SYNC_DEBOUNCE_MS,
  onStatus,
}: SyncEngineOptions): SyncEngine {
  let stopped = false
  let running: Promise<void> | null = null

  async function runOnce() {
    const state = store.getState()
    const plan = planSync({
      local: selectOrderedDocuments(state),
      localTombstones: state.tombstones,
      remote: await remote.list(),
    })

    // Remote-to-local first: applying the server's view before pushing means a
    // failure halfway through leaves the local store consistent with what the
    // server already holds, rather than ahead of it.
    if (plan.pull.length > 0) store.getState().applyRemote(plan.pull)
    if (plan.deleteLocal.length > 0) store.getState().applyRemoteDeletes(plan.deleteLocal)

    if (plan.push.length > 0) await remote.upsert(plan.push)
    if (plan.pushDeletes.length > 0) await remote.markDeleted(plan.pushDeletes, now())

    const settled = [...plan.settledTombstones, ...plan.pushDeletes]
    if (settled.length > 0) store.getState().forgetTombstones(settled)
  }

  async function syncNow(): Promise<void> {
    if (stopped) return
    // Serialise: two overlapping syncs would each read the other's half-done
    // state and fight.
    if (running) return running

    onStatus?.('syncing')
    running = runOnce()
      .then(() => {
        if (!stopped) onStatus?.('idle')
      })
      .catch((error: unknown) => {
        // No dirty set to persist: every unsynced change is still in the store
        // with a newer updatedAt than the server's copy, so the next full
        // merge picks it up on its own. That is the whole reason the planner
        // derives everything from timestamps.
        // The message only, never the error object: a rejected Supabase
        // call carries the request it failed on, and that request body is
        // the CV. Printing it would put CV content into the browser console
        // and, on the server, into logs held outside the EEA.
        console.warn(
          '[sync] failed, will retry:',
          error instanceof Error ? error.message : 'unknown error',
        )
        if (!stopped) onStatus?.(isOffline() ? 'offline' : 'error')
      })
      .finally(() => {
        running = null
      })

    return running
  }

  const scheduled = debounceTrailing(() => void syncNow(), debounceMs)

  const unsubscribe = store.subscribe((state, previous) => {
    if (stopped) return
    // Only document changes are worth a round trip. Owner changes are driven
    // by the session provider, which calls syncNow itself.
    if (state.documents === previous.documents && state.order === previous.order) return
    scheduled()
  })

  const retry = () => void syncNow()
  if (typeof window !== 'undefined') window.addEventListener('online', retry)

  return {
    syncNow,
    stop() {
      stopped = true
      scheduled.cancel()
      unsubscribe()
      if (typeof window !== 'undefined') window.removeEventListener('online', retry)
      onStatus?.('off')
    },
  }
}
