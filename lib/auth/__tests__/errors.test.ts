import { describe, expect, it } from 'vitest'

import { authErrorKey } from '@/lib/auth/errors'

describe('authErrorKey', () => {
  it.each([
    ['invalid_credentials', 'errorInvalid'],
    ['email_not_confirmed', 'errorUnconfirmed'],
    ['user_already_exists', 'errorTaken'],
    ['email_exists', 'errorTaken'],
    ['weak_password', 'errorWeak'],
    ['over_email_send_rate_limit', 'errorRate'],
    ['over_request_rate_limit', 'errorRate'],
  ])('prefers the %s code over the prose', (code, expected) => {
    // The code is Supabase's documented contract; the wording is not. Reading
    // prose alone already sent a real rate-limit error to a user as "something
    // went wrong".
    expect(authErrorKey({ code, message: 'anything at all' })).toBe(expected)
  })

  it('falls back to the message when an error carries no code', () => {
    expect(authErrorKey({ message: 'Invalid login credentials' })).toBe('errorInvalid')
  })

  it.each([
    ['Invalid login credentials', 'errorInvalid'],
    ['Email not confirmed', 'errorUnconfirmed'],
    ['User already registered', 'errorTaken'],
    ['Password should be at least 6 characters', 'errorWeak'],
    ['Email rate limit exceeded', 'errorRate'],
  ])('maps the prose %s', (message, expected) => {
    expect(authErrorKey(message)).toBe(expected)
  })

  it('falls back to a generic message rather than guessing', () => {
    // Guessing at an unfamiliar message risks telling someone their password
    // is wrong when the service is simply down.
    expect(authErrorKey('Service unavailable')).toBe('errorGeneric')
    expect(authErrorKey(undefined)).toBe('errorGeneric')
  })

  it('is case-insensitive, since the wording is not a stable contract', () => {
    expect(authErrorKey('INVALID LOGIN CREDENTIALS')).toBe('errorInvalid')
  })
})
