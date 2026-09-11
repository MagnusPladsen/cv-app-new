'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders a dialog into <body>.
 *
 * `position: fixed` is resolved against the nearest ancestor carrying a
 * transform, filter or backdrop-filter — not against the viewport. The
 * editor's mobile bottom bar uses backdrop-blur, so a dialog rendered inside
 * it was laid out against a 64px-tall bar and its buttons fell off the bottom
 * of the screen. A portal makes a dialog's position depend on nothing but the
 * document.
 *
 * No mounted flag: every caller returns null while closed, and a dialog only
 * opens from a click, so this never runs during server rendering or hydration.
 */
export function DialogPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
