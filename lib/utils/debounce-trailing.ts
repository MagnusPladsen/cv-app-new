/**
 * Trailing-edge debounce. The counterpart to throttle-leading: that one fires
 * first and swallows the rest, this one waits for the typing to stop. Pushing
 * on every keystroke would be one request per character.
 */
export function debounceTrailing<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: A | null = null

  const wrapped = (...args: A) => {
    pending = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const call = pending
      pending = null
      if (call) fn(...call)
    }, ms)
  }

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  wrapped.flush = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
    const call = pending
    pending = null
    if (call) fn(...call)
  }

  return wrapped
}
