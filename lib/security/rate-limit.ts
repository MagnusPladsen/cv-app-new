type Window = { count: number; startedAt: number }

const windows = new Map<string, Window>()

export const DEFAULT_LIMIT = 10
export const DEFAULT_WINDOW_MS = 60_000

/**
 * A fixed-window counter, held in memory.
 *
 * Be honest about what this is. On serverless it is per-instance, so a
 * distributed caller gets more through than the limit suggests. It stops the
 * realistic case - a loop against account deletion or sign-out from one
 * client - and it is the right shape to swap for a shared store later without
 * touching any call site. It is not a guarantee, and nothing in the privacy
 * documentation should describe it as one.
 */
export function rateLimit(
  key: string,
  {
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
    now = () => Date.now(),
  }: { limit?: number; windowMs?: number; now?: () => number } = {},
): { ok: boolean; retryAfterMs: number } {
  const current = now()
  const existing = windows.get(key)

  if (!existing || current - existing.startedAt >= windowMs) {
    windows.set(key, { count: 1, startedAt: current })
    return { ok: true, retryAfterMs: 0 }
  }

  existing.count += 1
  if (existing.count > limit) {
    return { ok: false, retryAfterMs: existing.startedAt + windowMs - current }
  }
  return { ok: true, retryAfterMs: 0 }
}

/**
 * The caller identity used for counting: the closest thing available before a
 * session exists. It is counted, never logged and never stored.
 */
export function callerKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `${scope}:${forwarded ?? 'unknown'}`
}

/** Test seam. Never called in production. */
export function resetRateLimits(): void {
  windows.clear()
}
