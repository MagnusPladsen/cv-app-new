import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Tailwind's Preflight sets `svg { display: block }`. A control holding an
 * icon and a label therefore stacks them vertically unless something makes it
 * a flex row — the icon becomes a block and forces a line break.
 *
 * It looks like a styling slip and reads as a broken button, and it has now
 * happened three times: the photo buttons, then "Legg til stilling" and
 * "Fjern" in all three entry forms. Nothing about writing the markup suggests
 * a layout mode is required, which is why this is a test rather than a habit.
 */
function tsxFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) tsxFiles(path, found)
    else if (entry.endsWith('.tsx') && !path.includes('__tests__')) found.push(path)
  }
  return found
}

/** className="…", className={`…`}, or className={someConst}. */
function classesOf(openingTag: string, consts: Map<string, string>): string | null {
  const match = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{(\w+)\})/.exec(openingTag)
  if (!match) return null
  if (match[1] !== undefined) return match[1]
  if (match[2] !== undefined) return match[2]
  return consts.get(match[3]!) ?? null
}

describe('controls that pair an icon with a label', () => {
  it('lay the two out in a row', () => {
    const files = [...tsxFiles('components'), ...tsxFiles('app')]

    const consts = new Map<string, string>()
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(/const (\w+) =\s*\n?\s*'([^']*)'/g)) {
        consts.set(match[1]!, match[2]!)
      }
    }

    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')

      for (const match of source.matchAll(/<(button|label|a|Link)\b/g)) {
        const tag = match[1]!
        const closing = source.indexOf(`</${tag}>`, match.index)
        if (closing === -1) continue

        const block = source.slice(match.index, closing)
        // A long block is a container that happens to contain a control, not
        // the control itself.
        if (block.length > 2500) continue

        const openEnd = block.indexOf('>')
        const openingTag = block.slice(0, openEnd)
        const body = block.slice(openEnd)

        // A control hidden from assistive technology is a backdrop or a
        // decorative overlay, and its "children" here are the next element.
        if (/aria-hidden="true"/.test(openingTag)) continue

        const hasIcon = /<[A-Z]\w+ aria-hidden="true"/.test(body)
        const hasLabel = /\{t\(/.test(body) || /> ?[A-Za-zÆØÅæøå][^<>{}]{2,60} ?</.test(body)
        if (!hasIcon || !hasLabel) continue

        const classes = classesOf(openingTag, consts)
        if (classes !== null && !/\bflex\b|\binline-flex\b|\bgrid\b/.test(classes)) {
          offenders.push(`${file}:${source.slice(0, match.index).split('\n').length}`)
        }
      }
    }

    expect(
      offenders,
      `icon and label will stack in: ${offenders.join(', ')}`,
    ).toEqual([])
  })
})
