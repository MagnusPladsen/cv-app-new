import { temporal, type TemporalState } from 'zundo'
import { create, useStore, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { throttleLeading } from '@/lib/utils/throttle-leading'

import type { CvDocument } from '@/lib/schema/cv'
import {
  type CreateDocumentInput,
  type FactoryDeps,
  createEmptyDocument,
} from '@/lib/schema/defaults'
import { type SchemaError, safeMigrateDocument } from '@/lib/schema/migrations'

export const DOCUMENTS_STORAGE_KEY = 'cvapp:documents:v1'

export const HISTORY_LIMIT = 100
export const HISTORY_GROUPING_MS = 400

export type DocumentsState = {
  documents: Record<string, CvDocument>
  /** Document ids, newest first. */
  order: string[]
  /**
   * The Supabase user these documents belong to, or null while anonymous.
   * Scoping the whole store rather than each document is what makes the
   * sign-out rule enforceable in one place.
   */
  ownerId: string | null
  /** Deleted document id -> deletion time in ms. */
  tombstones: Record<string, number>
}

export type ImportResult = { ok: true; id: string } | { ok: false; error: SchemaError }

export type DocumentsActions = {
  createDocument(input?: CreateDocumentInput): string
  duplicateDocument(id: string, name?: string): string | undefined
  deleteDocument(id: string): void
  renameDocument(id: string, name: string): void
  updateDocument(id: string, recipe: (draft: CvDocument) => void): void
  importDocument(raw: unknown): ImportResult
  adoptOwner(userId: string): AdoptOutcome
  releaseOwner(): void
  applyRemote(documents: CvDocument[]): void
  applyRemoteDeletes(ids: string[]): void
  forgetTombstones(ids: string[]): void
}

/**
 * What happened when a user signed in: their own documents were already here,
 * anonymous work was claimed for them, or a different account's documents had
 * to be cleared out first.
 */
export type AdoptOutcome = 'unchanged' | 'claimed' | 'switched'

export type DocumentsStore = DocumentsState & DocumentsActions

type StringStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type DocumentsStoreOptions = {
  /** Defaults to window.localStorage. Injected in tests. */
  storage?: StringStorage
  deps?: FactoryDeps
  /**
   * Called when a write to storage fails, which in practice means
   * QuotaExceededError. Without this the failure is silent and the user
   * discovers it only when their CVs are gone after a reload.
   */
  onStorageError?: (error: unknown) => void
}

/** Used during server rendering, where there is no localStorage to read. */
const noopStorage: StringStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

function resolve(deps: FactoryDeps = {}) {
  return {
    newId: deps.newId ?? (() => crypto.randomUUID()),
    now: deps.now ?? (() => Date.now()),
  }
}

/** Validates every stored document, silently dropping ones that no longer parse. */
function reviveState(persisted: unknown): DocumentsState {
  const empty: DocumentsState = { documents: {}, order: [], ownerId: null, tombstones: {} }
  if (typeof persisted !== 'object' || persisted === null) return empty

  const candidate = persisted as Partial<DocumentsState>
  const rawDocuments = candidate.documents
  if (typeof rawDocuments !== 'object' || rawDocuments === null) return empty

  const documents: Record<string, CvDocument> = {}
  for (const [id, raw] of Object.entries(rawDocuments)) {
    const result = safeMigrateDocument(raw)
    if (result.ok) documents[id] = result.document
  }

  const order = Array.isArray(candidate.order)
    ? candidate.order.filter((id): id is string => typeof id === 'string' && id in documents)
    : []

  // Any document that survived validation but is missing from `order` is
  // appended, so a corrupted order array can never hide a valid CV.
  for (const id of Object.keys(documents)) {
    if (!order.includes(id)) order.push(id)
  }

  const ownerId = typeof candidate.ownerId === 'string' ? candidate.ownerId : null

  const tombstones: Record<string, number> = {}
  const rawTombstones = candidate.tombstones
  if (typeof rawTombstones === 'object' && rawTombstones !== null) {
    for (const [id, at] of Object.entries(rawTombstones)) {
      // A tombstone for a document we also hold would delete it on the next
      // merge, so the live document wins here.
      if (typeof at === 'number' && !(id in documents)) tombstones[id] = at
    }
  }

  return { documents, order, ownerId, tombstones }
}

export type DocumentsHistory = Pick<DocumentsState, 'documents' | 'order'>

export type DocumentsStoreApi = UseBoundStore<StoreApi<DocumentsStore>> & {
  temporal: StoreApi<TemporalState<DocumentsHistory>>
}

export function createDocumentsStore(options: DocumentsStoreOptions = {}): DocumentsStoreApi {
  const { newId, now } = resolve(options.deps)
  const backing =
    options.storage ?? (typeof window === 'undefined' ? noopStorage : window.localStorage)

  const stringStorage: StringStorage = {
    getItem: (key) => backing.getItem(key),
    removeItem: (key) => backing.removeItem(key),
    setItem: (key, value) => {
      try {
        backing.setItem(key, value)
      } catch (error) {
        options.onStorageError?.(error)
      }
    },
  }

  return create<DocumentsStore>()(
    persist(
      temporal(
        immer((set, get) => ({
        documents: {},
        order: [],
        ownerId: null,
        tombstones: {},

        createDocument(input = {}) {
          const doc = createEmptyDocument(input, { newId, now })
          set((state) => {
            state.documents[doc.id] = doc
            state.order.unshift(doc.id)
          })
          return doc.id
        },

        duplicateDocument(id, name) {
          const original = get().documents[id]
          if (!original) return undefined
          const copy: CvDocument = {
            ...structuredClone(original),
            id: newId(),
            name: name ?? original.name,
            updatedAt: now(),
          }
          set((state) => {
            state.documents[copy.id] = copy
            state.order.unshift(copy.id)
          })
          return copy.id
        },

        deleteDocument(id) {
          set((state) => {
            delete state.documents[id]
            state.order = state.order.filter((existing) => existing !== id)
            // Without this, a delete here is undone by any other device that
            // still holds the document: sync would read it as "missing
            // locally, present remotely" and pull it straight back.
            state.tombstones[id] = now()
          })
        },

        renameDocument(id, name) {
          set((state) => {
            const doc = state.documents[id]
            if (!doc) return
            doc.name = name
            doc.updatedAt = now()
          })
        },

        updateDocument(id, recipe) {
          set((state) => {
            const doc = state.documents[id]
            if (!doc) return
            recipe(doc)
            doc.updatedAt = now()
          })
        },

        importDocument(raw) {
          const result = safeMigrateDocument(raw)
          if (!result.ok) return result
          const imported: CvDocument = { ...result.document, id: newId(), updatedAt: now() }
          set((state) => {
            state.documents[imported.id] = imported
            state.order.unshift(imported.id)
          })
          return { ok: true, id: imported.id }
        },

        adoptOwner(userId) {
          const current = get().ownerId
          if (current === userId) return 'unchanged'

          if (current === null) {
            // Anonymous work becomes theirs. This is the promise the beta
            // banner makes: what you build now comes with you.
            set((state) => {
              state.ownerId = userId
            })
            return 'claimed'
          }

          // A different account on the same browser. Their documents are on
          // the server; the local copies are the previous user's and must not
          // follow them into this account.
          set((state) => {
            state.documents = {}
            state.order = []
            state.tombstones = {}
            state.ownerId = userId
          })
          return 'switched'
        },

        releaseOwner() {
          set((state) => {
            state.documents = {}
            state.order = []
            state.tombstones = {}
            state.ownerId = null
          })
        },

        applyRemote(documents) {
          set((state) => {
            for (const doc of documents) {
              state.documents[doc.id] = doc
              delete state.tombstones[doc.id]
              if (!state.order.includes(doc.id)) state.order.unshift(doc.id)
            }
          })
        },

        applyRemoteDeletes(ids) {
          set((state) => {
            for (const id of ids) {
              delete state.documents[id]
              state.order = state.order.filter((existing) => existing !== id)
              delete state.tombstones[id]
            }
          })
        },

        forgetTombstones(ids) {
          set((state) => {
            for (const id of ids) delete state.tombstones[id]
          })
        },
        })),
        {
          limit: HISTORY_LIMIT,
          partialize: (state): DocumentsHistory => ({
            documents: state.documents,
            order: state.order,
          }),
          handleSet: (handleSet) => throttleLeading(handleSet, HISTORY_GROUPING_MS),
        },
      ),
      {
        name: DOCUMENTS_STORAGE_KEY,
        version: 2,
        storage: createJSONStorage(() => stringStorage),
        partialize: (state) => ({
          documents: state.documents,
          order: state.order,
          ownerId: state.ownerId,
          tombstones: state.tombstones,
        }),
        // Mandatory, not decorative: zustand discards the entire persisted
        // state on a version bump when no migrate function is provided, which
        // would silently delete every CV a returning user has. v1 predates
        // accounts, so everything in it is anonymous work.
        migrate: (persisted, version) =>
          version < 2
            ? { ...(persisted as object), ownerId: null, tombstones: {} }
            : persisted,
        merge: (persisted, current) => ({ ...current, ...reviveState(persisted) }),
      },
    ),
  ) as DocumentsStoreApi
}

export const useDocuments: DocumentsStoreApi = createDocumentsStore()

/**
 * React hook over the undo/redo store.
 * `useDocumentsTemporal((s) => s.undo)` returns a stable undo function.
 */
export function useDocumentsTemporal<T>(
  selector: (state: TemporalState<DocumentsHistory>) => T,
): T {
  return useStore(useDocuments.temporal, selector)
}

export function selectOrderedDocuments(state: DocumentsState): CvDocument[] {
  return state.order
    .map((id) => state.documents[id])
    .filter((doc): doc is CvDocument => Boolean(doc))
}

export function selectDocument(id: string) {
  return (state: DocumentsState): CvDocument | undefined => state.documents[id]
}
