/**
 * Calls `fn` immediately, then ignores every call made within `waitMs` of it.
 * There is no trailing call: the first value in a burst wins.
 */
export function throttleLeading<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): (...args: Args) => void {
  let blockedUntil = 0

  return (...args: Args) => {
    const now = Date.now()
    if (now < blockedUntil) return
    blockedUntil = now + waitMs
    fn(...args)
  }
}
