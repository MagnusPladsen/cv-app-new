import { describe, expect, it, vi } from 'vitest'

import { readFlag, writeFlag } from '@/lib/storage/flag'

function memory(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

const throwing = {
  getItem: () => {
    throw new DOMException('blocked', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('blocked', 'SecurityError')
  },
}

describe('readFlag', () => {
  it('is false when unset', () => {
    expect(readFlag('k', memory())).toBe(false)
  })

  it('is true once written', () => {
    const storage = memory()
    writeFlag('k', storage)
    expect(readFlag('k', storage)).toBe(true)
  })

  it('treats any other stored value as unset', () => {
    expect(readFlag('k', memory({ k: 'yes' }))).toBe(false)
  })

  it('treats a throwing read as unset rather than crashing', () => {
    expect(() => readFlag('k', throwing)).not.toThrow()
    expect(readFlag('k', throwing)).toBe(false)
  })
})

describe('writeFlag', () => {
  it('stores the flag', () => {
    const storage = memory()
    writeFlag('k', storage)
    expect(storage.map.get('k')).toBe('1')
  })

  it('swallows a throwing write, so an export is never interrupted', () => {
    expect(() => writeFlag('k', throwing)).not.toThrow()
  })

  it('does nothing when there is no storage at all', () => {
    const setItem = vi.fn()
    expect(() => writeFlag('k', { getItem: () => null, setItem })).not.toThrow()
    expect(setItem).toHaveBeenCalledTimes(1)
  })
})
