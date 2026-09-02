'use client'

import { useSyncExternalStore } from 'react'

/** The hydration flag never changes after mount, so there is nothing to subscribe to. */
const subscribe = () => () => {}

/**
 * False during the server render and the first client render, true afterwards.
 * CV data lives in localStorage, which the server cannot see, so any component
 * reading it must render a placeholder until this returns true or React will
 * report a hydration mismatch.
 *
 * Implemented with useSyncExternalStore rather than an effect: differing
 * server and client snapshots is exactly what this hook is for, and it avoids
 * the cascading render that setState-in-an-effect causes.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
