import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { debounceTrailing } from '@/lib/utils/debounce-trailing'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('debounceTrailing', () => {
  it('fires once, after the quiet period, with the last arguments', () => {
    const spy = vi.fn()
    const debounced = debounceTrailing(spy, 100)
    debounced('a')
    debounced('b')
    vi.advanceTimersByTime(99)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledExactlyOnceWith('b')
  })

  it('flush fires immediately, cancel drops the call', () => {
    const spy = vi.fn()
    const debounced = debounceTrailing(spy, 100)
    debounced('a')
    debounced.flush()
    expect(spy).toHaveBeenCalledExactlyOnceWith('a')

    debounced('b')
    debounced.cancel()
    vi.advanceTimersByTime(200)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('flush on an idle debounce does nothing', () => {
    const spy = vi.fn()
    debounceTrailing(spy, 100).flush()
    expect(spy).not.toHaveBeenCalled()
  })
})
