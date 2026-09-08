/** How far a provider's error text is allowed to travel into our URL. */
const MAX_REASON = 160

/**
 * Normalises the reason an OAuth round trip failed into one short, safe
 * string for the error page.
 *
 * Everything here arrives on a redirect the provider controls, so it is
 * untrusted text. React renders it as text and never as markup, but it is
 * still capped and stripped of control characters so it cannot lay out
 * convincing lines of its own on our page.
 */
export function normaliseOAuthReason(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  return cleaned.length > MAX_REASON ? `${cleaned.slice(0, MAX_REASON)}\u2026` : cleaned
}

/**
 * The provider reports failure on the query string rather than by failing the
 * request, so a callback with no `code` is not necessarily a bug on our side.
 */
export function readOAuthError(params: URLSearchParams): string | null {
  return normaliseOAuthReason(params.get('error_description') ?? params.get('error') ?? null)
}
