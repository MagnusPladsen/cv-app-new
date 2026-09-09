import { beforeEach, describe, expect, it } from 'vitest'

import { callerKey, rateLimit, resetRateLimits } from '@/lib/security/rate-limit'

beforeEach(() => resetRateLimits())

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const options = { limit: 3, windowMs: 1000, now: () => 0 }
    expect(rateLimit('a', options).ok).toBe(true)
    expect(rateLimit('a', options).ok).toBe(true)
    expect(rateLimit('a', options).ok).toBe(true)
  })

  it('refuses the one after, and says how long to wait', () => {
    const options = { limit: 1, windowMs: 1000, now: () => 0 }
    rateLimit('a', options)
    const second = rateLimit('a', options)

    expect(second.ok).toBe(false)
    expect(second.retryAfterMs).toBeGreaterThan(0)
  })

  it('forgets the window once it has passed', () => {
    let now = 0
    const options = { limit: 1, windowMs: 1000, now: () => now }
    rateLimit('a', options)
    now = 1001
    expect(rateLimit('a', options).ok).toBe(true)
  })

  it('counts each key separately, so one caller cannot lock out another', () => {
    const options = { limit: 1, windowMs: 1000, now: () => 0 }
    rateLimit('a', options)
    expect(rateLimit('b', options).ok).toBe(true)
  })
})

describe('callerKey', () => {
  it('scopes the count, so one endpoint does not exhaust another budget', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.5' },
    })

    expect(callerKey(request, 'sign-out')).toBe('sign-out:203.0.113.5')
    expect(callerKey(request, 'delete-account')).not.toBe(callerKey(request, 'sign-out'))
  })

  it('takes the first address, since the header is a chain', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' },
    })

    expect(callerKey(request, 's')).toBe('s:203.0.113.5')
  })

  it('still counts a caller with no forwarded address', () => {
    // Falling back to a shared bucket is deliberate: an unidentifiable
    // caller should be limited, not exempt.
    expect(callerKey(new Request('https://example.test'), 's')).toBe('s:unknown')
  })
})
