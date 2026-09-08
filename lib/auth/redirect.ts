/**
 * The `next` parameter comes back from an OAuth round trip, so it is attacker
 * influenceable: anything that is not plainly a path on this site becomes the
 * fallback. Rejecting `//` and `/\` matters as much as rejecting `https://` -
 * browsers read both as "somewhere else entirely".
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  if (raw.startsWith('/\\')) return fallback
  return raw
}
