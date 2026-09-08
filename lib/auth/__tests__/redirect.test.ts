import { describe, expect, it } from 'vitest'

import { safeNextPath } from '@/lib/auth/redirect'

describe('safeNextPath', () => {
  it('keeps a relative app path', () => {
    expect(safeNextPath('/no/cv')).toBe('/no/cv')
  })

  it('keeps a path with a query string', () => {
    expect(safeNextPath('/no/cv/abc?tab=design')).toBe('/no/cv/abc?tab=design')
  })

  it('falls back when the parameter is missing', () => {
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath(undefined)).toBe('/')
    expect(safeNextPath('')).toBe('/')
  })

  it('refuses an absolute URL, which would be an open redirect', () => {
    expect(safeNextPath('https://evil.example/phish')).toBe('/')
  })

  it('refuses a protocol-relative URL, which browsers also treat as absolute', () => {
    expect(safeNextPath('//evil.example/phish')).toBe('/')
  })

  it('refuses a backslash-prefixed path, which some browsers normalise to //', () => {
    expect(safeNextPath('/\\evil.example')).toBe('/')
  })

  it('takes the fallback the caller supplies', () => {
    expect(safeNextPath('https://evil.example', '/no/cv')).toBe('/no/cv')
  })
})
