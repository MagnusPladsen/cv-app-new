import { notFound } from 'next/navigation'

/**
 * Catches every unmatched path under a locale so the segment's not-found page
 * renders.
 *
 * Without this, an unknown URL matches no route at all and Next falls back to
 * its built-in 404 — which sits outside the locale layout (no header, no
 * footer, no translations) and carries an inline <style> block that the app's
 * Content-Security-Policy blocks. A `not-found.tsx` alone does not help: it
 * handles `notFound()` thrown inside the segment, not URLs that never reach it.
 */
export default function CatchAllNotFound(): never {
  notFound()
}
