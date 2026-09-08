'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { useDocuments } from '@/lib/store/documents'
import { createSyncEngine, type SyncEngine } from '@/lib/sync/engine'
import { createSupabaseRemote } from '@/lib/sync/remote'
import { useSyncStatus } from '@/lib/sync/status'
import { getBrowserSupabase } from '@/lib/supabase/client'

export type SessionUser = { id: string; email: string | null }

const SessionContext = createContext<SessionUser | null>(null)

export function useSessionUser(): SessionUser | null {
  return useContext(SessionContext)
}

/**
 * Owns the whole lifecycle: session in, engine up; session out, engine down
 * and local state cleared. Keeping it in one component is what makes the
 * sign-out rule checkable by reading a single file.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return

    let engine: SyncEngine | null = null

    function teardown() {
      engine?.stop()
      engine = null
    }

    function startFor(nextUser: SessionUser) {
      teardown()

      // Captured before adoptOwner, which is what clears or claims them.
      const localCount = Object.keys(useDocuments.getState().documents).length
      // adoptOwner decides whether this is the same person coming back,
      // anonymous work being claimed, or a different account that must not
      // inherit the previous one's documents.
      const outcome = useDocuments.getState().adoptOwner(nextUser.id)
      if (outcome === 'claimed' && localCount > 0) {
        useSyncStatus.getState().setClaimed(localCount)
      }

      const remote = createSupabaseRemote(supabase!, nextUser.id)
      engine = createSyncEngine({
        store: useDocuments,
        remote,
        onStatus: (status) => useSyncStatus.getState().set(status, Date.now()),
      })
      void engine.syncNow()
      setUser(nextUser)
    }

    // onAuthStateChange fires INITIAL_SESSION on mount, which is how a
    // returning user's engine starts without a separate getSession() call.
    // Do not add one: two code paths racing to start the engine is exactly
    // what the memoised client exists to avoid.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        startFor({ id: session.user.id, email: session.user.email ?? null })
        return
      }
      teardown()
      if (event === 'SIGNED_OUT') useDocuments.getState().releaseOwner()
      useSyncStatus.getState().set('off')
      setUser(null)
    })

    return () => {
      data.subscription.unsubscribe()
      teardown()
    }
  }, [])

  return <SessionContext value={user}>{children}</SessionContext>
}
