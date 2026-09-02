import { describe, expect, it } from 'vitest'
import { APP_NAME, STORAGE_PREFIX } from '@/lib/app-meta'

describe('app metadata', () => {
  it('exposes the application name', () => {
    expect(APP_NAME).toBe('CVApp')
  })

  it('namespaces localStorage keys', () => {
    expect(STORAGE_PREFIX).toBe('cvapp:')
  })
})
