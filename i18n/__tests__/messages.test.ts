import { describe, expect, it } from 'vitest'
import en from '@/messages/en.json'
import no from '@/messages/no.json'
import { routing } from '@/i18n/routing'

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, nested]) =>
    flatten(nested, prefix ? `${prefix}.${key}` : key),
  )
}

describe('routing', () => {
  it('supports Norwegian and English', () => {
    expect(routing.locales).toEqual(['no', 'en'])
  })

  it('defaults to Norwegian', () => {
    expect(routing.defaultLocale).toBe('no')
  })
})

describe('UI messages', () => {
  it('define the same keys in both languages', () => {
    expect(flatten(no).sort()).toEqual(flatten(en).sort())
  })

  it('have no empty strings', () => {
    for (const messages of [no, en]) {
      const walk = (value: unknown, path: string): void => {
        if (typeof value === 'string') {
          expect(value.trim(), `${path} is empty`).not.toBe('')
          return
        }
        if (value && typeof value === 'object') {
          for (const [key, nested] of Object.entries(value)) walk(nested, `${path}.${key}`)
        }
      }
      walk(messages, 'root')
    }
  })
})
