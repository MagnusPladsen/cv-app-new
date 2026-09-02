'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * True when the media query matches. Uses useSyncExternalStore so the server
 * snapshot is deterministic (false) and there is no setState-in-effect.
 *
 * This is a real DOM query rather than a CSS class toggle because the editor
 * must mount exactly one preview: a CSS-hidden second `.cv-doc` would still be
 * in the DOM, and the export path clones the first one it finds.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** Tailwind's `lg` breakpoint, where the editor switches to the split layout. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
