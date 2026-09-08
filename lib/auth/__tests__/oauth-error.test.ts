import { describe, expect, it } from 'vitest'

import { normaliseOAuthReason, readOAuthError } from '@/lib/auth/oauth-error'

describe('normaliseOAuthReason', () => {
  it('passes a plain message through', () => {
    expect(normaliseOAuthReason('access_denied')).toBe('access_denied')
  })

  it('treats missing and blank as no reason', () => {
    expect(normaliseOAuthReason(null)).toBeNull()
    expect(normaliseOAuthReason('   ')).toBeNull()
  })

  it('collapses whitespace and strips control characters', () => {
    // The text arrives on a provider-controlled redirect, so newlines must not
    // let it lay out lines of its own on our page.
    expect(normaliseOAuthReason('bad\n\nrequest\tnow')).toBe('bad request now')
  })

  it('truncates a very long message', () => {
    const reason = normaliseOAuthReason('x'.repeat(500))!
    expect(reason.length).toBeLessThanOrEqual(161)
    expect(reason.endsWith('\u2026')).toBe(true)
  })
})

describe('readOAuthError', () => {
  it('prefers the human-readable description', () => {
    const params = new URLSearchParams({
      error: 'server_error',
      error_description: 'Unable to exchange external code',
    })
    expect(readOAuthError(params)).toBe('Unable to exchange external code')
  })

  it('falls back to the error code', () => {
    expect(readOAuthError(new URLSearchParams({ error: 'access_denied' }))).toBe('access_denied')
  })

  it('reports nothing when the provider reported nothing', () => {
    expect(readOAuthError(new URLSearchParams({ code: 'abc' }))).toBeNull()
  })
})
