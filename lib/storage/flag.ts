/**
 * A boolean flag remembered in localStorage.
 *
 * Every access is guarded: private browsing, cleared site data and blocked
 * storage all throw on read or write. A flag that cannot be read is treated as
 * unset, which for a one-time hint means showing it again rather than crashing.
 */
export type FlagStorage = Pick<Storage, 'getItem' | 'setItem'>

function resolve(storage?: FlagStorage): FlagStorage | undefined {
  if (storage) return storage
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function readFlag(key: string, storage?: FlagStorage): boolean {
  const target = resolve(storage)
  if (!target) return false
  try {
    return target.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeFlag(key: string, storage?: FlagStorage): void {
  const target = resolve(storage)
  if (!target) return
  try {
    target.setItem(key, '1')
  } catch {
    // A flag that cannot be stored just means the hint shows again. Not worth
    // interrupting an export over.
  }
}
