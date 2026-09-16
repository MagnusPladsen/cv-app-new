'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import type { SyncEngine } from '@/lib/sync/engine'

export type SessionUser = { id: string; email: string | null }

const SessionContext = createContext<SessionUser | null>(null)

export function useSessionUser(): SessionUser | null {
  return useContext(SessionContext)
}

/**
 * Owns the whole lifecycle: session in, engine up; session out, engine down
 * and local state cleared. Keeping it in one component is what makes the
 * sign-out rule checkable by reading a single file.
 *
 * Everything it needs is imported inside the effect rather than at the top of
 * the file. This component sits in the root layout, so a static import put the
 * document store, the sync engine and the Supabase client into the first
 * JavaScript every page loads - 389 KiB, on a landing page that has no session
 * and no documents. Imported here they are fetched after hydration instead of
 * parsed before it.
 *
 * It does not change when the session resolves: `onAuthStateChange` was always
 * asynchronous, so `user` started as null and arrived a tick later either way.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    let cancelled = false
    let engine: SyncEngine | null = null
    let unsubscribe: (() => void) | null = null

    function teardown() {
      engine?.stop()
      engine = null
    }

    void (async () => {
      const [
        { getBrowserSupabase },
        { useDocuments },
        { createSyncEngine },
        { createSupabaseRemote },
        { useSyncStatus },
      ] = await Promise.all([
        import('@/lib/supabase/client'),
        import('@/lib/store/documents'),
        import('@/lib/sync/engine'),
        import('@/lib/sync/remote'),
        import('@/lib/sync/status'),
      ])

      // Unmounted while those were loading.
      if (cancelled) return

      const supabase = getBrowserSupabase()
      if (!supabase) return

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

        // No session. Release the documents when this browser is known to
        // have had one, because signing out never produces SIGNED_OUT here:
        // it is a form POST to /auth/sign-out, which clears the cookies on
        // the server and redirects. The page reloads, the browser client has
        // no previous session to compare against, and it reports
        // INITIAL_SESSION with null. Keying the clean-up on SIGNED_OUT alone
        // left the signed-out person's CVs in localStorage for whoever used
        // the browser next - which is the one thing the sign-out rule
        // promises does not happen.
        //
        // Scoped to those two events rather than any null session, so a
        // transient failure mid-session cannot wipe unsynced work.
        const signedOut = event === 'SIGNED_OUT' || event === 'INITIAL_SESSION'
        if (signedOut && useDocuments.getState().ownerId !== null) {
          useDocuments.getState().releaseOwner()
        }

        useSyncStatus.getState().set('off')
        setUser(null)
      })

      unsubscribe = () => data.subscription.unsubscribe()

      // Unmounted between the import finishing and the subscription existing:
      // the cleanup below has already run and had nothing to cancel.
      if (cancelled) {
        unsubscribe()
        teardown()
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
      teardown()
    }
  }, [])

  return <SessionContext value={user}>{children}</SessionContext>
}
