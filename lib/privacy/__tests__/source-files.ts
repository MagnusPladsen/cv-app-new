import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Every .ts/.tsx file under a directory, excluding tests. */
export function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, found)
    else if (/\.(ts|tsx)$/.test(entry) && !path.includes('__tests__')) found.push(path)
  }
  return found
}
