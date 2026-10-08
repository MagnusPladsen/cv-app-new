// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { LIMITS, visitorHash } from '@/lib/ai/budget'

const requestFrom = (ip: string, agent = 'Mozilla/5.0') =>
  new Request('https://cvapp.test/api/ai', {
    headers: { 'x-forwarded-for': ip, 'user-agent': agent },
  })

describe('who is asking, without knowing who is asking', () => {
  it('gives the same visitor the same hash within a day', () => {
    const day = new Date('2026-10-08T09:00:00Z')
    const later = new Date('2026-10-08T23:30:00Z')

    expect(visitorHash(requestFrom('1.2.3.4'), 'secret', day)).toBe(
      visitorHash(requestFrom('1.2.3.4'), 'secret', later),
    )
  })

  it('rotates at midnight, so yesterday cannot be linked to today', () => {
    expect(visitorHash(requestFrom('1.2.3.4'), 'secret', new Date('2026-10-08T12:00:00Z'))).not.toBe(
      visitorHash(requestFrom('1.2.3.4'), 'secret', new Date('2026-10-09T12:00:00Z')),
    )
  })

  it('separates two visitors', () => {
    const now = new Date('2026-10-08T12:00:00Z')
    expect(visitorHash(requestFrom('1.2.3.4'), 'secret', now)).not.toBe(
      visitorHash(requestFrom('5.6.7.8'), 'secret', now),
    )
  })

  it('contains neither the address nor the agent it was made from', () => {
    const hash = visitorHash(requestFrom('1.2.3.4', 'Firefox/130'), 'secret')

    expect(hash).toMatch(/^[0-9a-f]{32}$/)
    expect(hash).not.toContain('1.2.3.4')
  })

  it('keeps the daily caps in the order that makes them mean anything', () => {
    // A per-chat limit above the per-day limit would never fire; a global cap
    // below one visitor's day would make the first visitor the only one.
    expect(LIMITS.messagesPerChat).toBeLessThanOrEqual(LIMITS.messagesPerVisitorPerDay)
    expect(LIMITS.messagesPerVisitorPerDay).toBeLessThan(LIMITS.messagesGlobalPerDay)
    expect(LIMITS.chatsPerVisitorPerDay * LIMITS.messagesPerChat).toBeGreaterThanOrEqual(
      LIMITS.messagesPerVisitorPerDay,
    )
  })
})
