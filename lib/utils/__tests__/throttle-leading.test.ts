import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttleLeading } from '@/lib/utils/throttle-leading'

describe('throttleLeading', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('invokes immediately on the first call', () => {
    const spy = vi.fn()
    throttleLeading(spy, 400)('first')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('first')
  })

  it('drops calls made inside the window', () => {
    const spy = vi.fn()
    const throttled = throttleLeading(spy, 400)
    throttled('a')
    throttled('b')
    throttled('c')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('a')
  })

  it('does not fire a trailing call when the window elapses', () => {
    const spy = vi.fn()
    const throttled = throttleLeading(spy, 400)
    throttled('a')
    throttled('b')
    vi.advanceTimersByTime(400)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('invokes again once the window has elapsed', () => {
    const spy = vi.fn()
    const throttled = throttleLeading(spy, 400)
    throttled('a')
    vi.advanceTimersByTime(400)
    throttled('b')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith('b')
  })

  it('treats each throttled function as independent', () => {
    const first = vi.fn()
    const second = vi.fn()
    throttleLeading(first, 400)('a')
    throttleLeading(second, 400)('b')
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})
