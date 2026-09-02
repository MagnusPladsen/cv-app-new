import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { CvDocument } from '@/lib/schema/cv'
import {
  type CreateDocumentInput,
  type FactoryDeps,
  createEmptyDocument,
} from '@/lib/schema/defaults'
import { type SchemaError, safeMigrateDocument } from '@/lib/schema/migrations'

export const DOCUMENTS_STORAGE_KEY = 'cvapp:documents:v1'

export type DocumentsState = {
  documents: Record<string, CvDocument>
  /** Document ids, newest first. */
  order: string[]
}

export type ImportResult = { ok: true; id: string } | { ok: false; error: SchemaError }

export type DocumentsActions = {
  createDocument(input?: CreateDocumentInput): string
  duplicateDocument(id: string, name?: string): string | undefined
  deleteDocument(id: string): void
  renameDocument(id: string, name: string): void
  updateDocument(id: string, recipe: (draft: CvDocument) => void): void
  importDocument(raw: unknown): ImportResult
  replaceAll(documents: CvDocument[]): void
}

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
  const empty: DocumentsState = { documents: {}, order: [] }
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

  return { documents, order }
}

export function createDocumentsStore(
  options: DocumentsStoreOptions = {},
): UseBoundStore<StoreApi<DocumentsStore>> {
  const { newId, now } = resolve(options.deps)
  const stringStorage =
    options.storage ?? (typeof window === 'undefined' ? noopStorage : window.localStorage)

  return create<DocumentsStore>()(
    persist(
      immer((set, get) => ({
        documents: {},
        order: [],

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

        replaceAll(documents) {
          set((state) => {
            state.documents = Object.fromEntries(documents.map((doc) => [doc.id, doc]))
            state.order = documents.map((doc) => doc.id)
          })
        },
      })),
      {
        name: DOCUMENTS_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => stringStorage),
        partialize: (state) => ({ documents: state.documents, order: state.order }),
        merge: (persisted, current) => ({ ...current, ...reviveState(persisted) }),
      },
    ),
  )
}

export const useDocuments = createDocumentsStore()

export function selectOrderedDocuments(state: DocumentsState): CvDocument[] {
  return state.order
    .map((id) => state.documents[id])
    .filter((doc): doc is CvDocument => Boolean(doc))
}

export function selectDocument(id: string) {
  return (state: DocumentsState): CvDocument | undefined => state.documents[id]
}
