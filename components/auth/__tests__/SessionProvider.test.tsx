import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionProvider, useSessionUser } from '@/components/auth/SessionProvider'

/**
 * This component decides what happens to somebody's CVs when they sign in:
 * claimed, kept, or cleared because a different account arrived. It had no
 * tests, which is a poor place to be before moving its imports around.
 */

type AuthCallback = (event: string, session: { user: { id: string; email: string } } | null) => void

const auth = vi.hoisted(() => ({
  callback: null as AuthCallback | null,
  unsubscribe: vi.fn(),
  client: null as unknown,
}))

const store = vi.hoisted(() => ({
  documents: {} as Record<string, unknown>,
  ownerId: null as string | null,
  adoptOwner: vi.fn((_id: string) => 'unchanged' as 'unchanged' | 'claimed' | 'switched'),
  releaseOwner: vi.fn(),
}))

const status = vi.hoisted(() => ({ set: vi.fn(), setClaimed: vi.fn() }))
const engine = vi.hoisted(() => ({ stop: vi.fn(), syncNow: vi.fn(async () => {}) }))
const created = vi.hoisted(() => ({ engines: 0, remotes: [] as string[] }))

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => auth.client,
}))

vi.mock('@/lib/store/documents', () => ({
  useDocuments: {
    getState: () => ({
      documents: store.documents,
      ownerId: store.ownerId,
      adoptOwner: store.adoptOwner,
      releaseOwner: store.releaseOwner,
    }),
  },
}))

vi.mock('@/lib/sync/status', () => ({
  useSyncStatus: { getState: () => status },
}))

vi.mock('@/lib/sync/engine', () => ({
  createSyncEngine: () => {
    created.engines += 1
    return engine
  },
}))

vi.mock('@/lib/sync/remote', () => ({
  createSupabaseRemote: (_client: unknown, userId: string) => {
    created.remotes.push(userId)
    return {}
  },
}))

function Probe() {
  const user = useSessionUser()
  return <span data-testid="user">{user ? user.id : 'none'}</span>
}

const signIn = (id = 'user-1') =>
  auth.callback?.('SIGNED_IN', { user: { id, email: `${id}@example.no` } })

beforeEach(() => {
  auth.callback = null
  auth.unsubscribe = vi.fn()
  auth.client = {
    auth: {
      onAuthStateChange: (callback: AuthCallback) => {
        auth.callback = callback
        return { data: { subscription: { unsubscribe: auth.unsubscribe } } }
      },
    },
  }
  store.documents = {}
  store.ownerId = null
  // Faithful to the real store: adopting sets the owner, releasing clears it.
  // Without that the guard on `ownerId` cannot be exercised honestly.
  store.adoptOwner = vi.fn((id: string) => {
    store.ownerId = id
    return 'unchanged' as const
  })
  store.releaseOwner = vi.fn(() => {
    store.ownerId = null
  })
  status.set = vi.fn()
  status.setClaimed = vi.fn()
  engine.stop = vi.fn()
  created.engines = 0
  created.remotes = []
})

describe('SessionProvider', () => {
  it('does nothing at all when Supabase is not configured', async () => {
    auth.client = null
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'))
    expect(store.adoptOwner).not.toHaveBeenCalled()
    expect(created.engines).toBe(0)
  })

  it('adopts the signed-in user and starts syncing for them', async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )

    await waitFor(() => expect(auth.callback).not.toBeNull())
    signIn()

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user-1'))
    expect(store.adoptOwner).toHaveBeenCalledWith('user-1')
    expect(created.remotes).toEqual(['user-1'])
    expect(created.engines).toBe(1)
  })

  it('announces a claim, with the count taken before the documents change hands', async () => {
    // The count has to be read before adoptOwner, which is the call that
    // claims or clears them.
    store.documents = { a: {}, b: {}, c: {} }
    store.adoptOwner = vi.fn((id: string) => {
      store.ownerId = id
      return 'claimed' as const
    })

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())
    signIn()

    await waitFor(() => expect(status.setClaimed).toHaveBeenCalledWith(3))
  })

  it('says nothing about a claim when there was nothing local to claim', async () => {
    store.adoptOwner = vi.fn((id: string) => {
      store.ownerId = id
      return 'claimed' as const
    })
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())
    signIn()

    await waitFor(() => expect(store.adoptOwner).toHaveBeenCalled())
    expect(status.setClaimed).not.toHaveBeenCalled()
  })

  it('releases the documents on sign-out, and stops the engine', async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())
    signIn()
    await waitFor(() => expect(created.engines).toBe(1))

    auth.callback?.('SIGNED_OUT', null)

    await waitFor(() => expect(store.releaseOwner).toHaveBeenCalled())
    expect(engine.stop).toHaveBeenCalled()
    expect(status.set).toHaveBeenCalledWith('off')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('does not release on a session simply going away without a sign-out', async () => {
    // Only SIGNED_OUT clears local documents. A token that expired is not a
    // decision to hand the CVs back.
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())
    signIn()
    await waitFor(() => expect(created.engines).toBe(1))

    auth.callback?.('TOKEN_REFRESHED', null)

    await waitFor(() => expect(engine.stop).toHaveBeenCalled())
    expect(store.releaseOwner).not.toHaveBeenCalled()
  })

  it('starts one engine per account, tearing the previous one down', async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())

    signIn('user-1')
    await waitFor(() => expect(created.engines).toBe(1))
    signIn('user-2')

    await waitFor(() => expect(created.engines).toBe(2))
    expect(engine.stop).toHaveBeenCalled()
    expect(created.remotes).toEqual(['user-1', 'user-2'])
  })

  it('clears the documents when the app starts with no session but a stored owner', async () => {
    // How signing out actually happens: a form POST to /auth/sign-out, which
    // clears the cookies server-side and redirects. The page reloads, so the
    // browser client has no previous session to compare against and reports
    // INITIAL_SESSION with null - never SIGNED_OUT. Keying the clean-up on
    // SIGNED_OUT alone left the signed-out person's CVs in localStorage for
    // whoever used the browser next.
    store.ownerId = 'user-1'

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())

    auth.callback?.('INITIAL_SESSION', null)

    await waitFor(() => expect(store.releaseOwner).toHaveBeenCalled())
  })

  it('leaves an anonymous browser alone at startup', async () => {
    // Nobody has ever signed in here, so there is nothing to release and the
    // local CVs belong to whoever is sitting there.
    store.ownerId = null

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())

    auth.callback?.('INITIAL_SESSION', null)

    await waitFor(() => expect(status.set).toHaveBeenCalledWith('off'))
    expect(store.releaseOwner).not.toHaveBeenCalled()
  })

  it('unsubscribes and stops the engine when it goes away', async () => {
    const view = render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(auth.callback).not.toBeNull())
    signIn()
    await waitFor(() => expect(created.engines).toBe(1))

    view.unmount()

    await waitFor(() => expect(auth.unsubscribe).toHaveBeenCalled())
    expect(engine.stop).toHaveBeenCalled()
  })
})
