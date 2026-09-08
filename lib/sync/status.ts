import { create } from 'zustand'

import type { SyncStatus } from './types'

type SyncStatusState = {
  status: SyncStatus
  lastSyncedAt: number | null
  /** Set once, after a sign-in claims anonymous work, so the UI can say so. */
  claimedCount: number | null
  set(status: SyncStatus, lastSyncedAt?: number): void
  setClaimed(count: number): void
  clearClaimed(): void
}

/**
 * Deliberately separate from the documents store: sync status is not part of
 * the document history, and mixing it in would make undo step through
 * "syncing" states.
 */
export const useSyncStatus = create<SyncStatusState>()((set) => ({
  status: 'off',
  lastSyncedAt: null,
  claimedCount: null,
  set: (status, lastSyncedAt) =>
    set((state) => ({ status, lastSyncedAt: lastSyncedAt ?? state.lastSyncedAt })),
  setClaimed: (count) => set({ claimedCount: count }),
  clearClaimed: () => set({ claimedCount: null }),
}))
