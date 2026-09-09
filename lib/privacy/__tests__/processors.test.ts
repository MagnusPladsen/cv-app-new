import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { PROCESSORS } from '@/lib/privacy/processors'
import { sourceFiles } from './source-files'

describe('the processor list', () => {
  it('covers every external host the app talks to', () => {
    // A vendor reached for without a DPA and a policy entry is exactly the
    // Art. 28 failure this list exists to prevent, and it is one import away.
    const declared = PROCESSORS.flatMap((processor) => processor.hosts)
    const allowed = [
      ...declared,
      'localhost',
      '127.0.0.1',
      // Documentation links and test fixtures, not runtime calls.
      'example.com',
      'example.no',
      'example.test',
      'datatilsynet.no',
      'lovdata.no',
      'developer.mozilla.org',
      'react.dev',
      'openapi.vercel.sh',
    ]

    // Sample CV content, not network calls: the demo document contains a
    // fictional person's GitHub and LinkedIn addresses because a realistic CV
    // has them. Excluded by name rather than by widening the allowlist, which
    // would also stop the test noticing a real call to github.com.
    const contentOnly = ['lib/schema/demo.ts']

    const found = new Set<string>()
    for (const file of [
      ...sourceFiles('lib'),
      ...sourceFiles('app'),
      ...sourceFiles('components'),
    ].filter((file) => !contentOnly.includes(file))) {
      for (const match of readFileSync(file, 'utf8').matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        const host = match[1]!.toLowerCase()
        if (!allowed.some((entry) => host === entry || host.endsWith(`.${entry}`))) {
          found.add(`${host} (${file})`)
        }
      }
    }

    expect([...found], `undeclared external hosts: ${[...found].join(', ')}`).toEqual([])
  })

  it('gives every processor a purpose and a country, which the policy must state', () => {
    for (const processor of PROCESSORS) {
      expect(processor.name.trim()).not.toBe('')
      expect(processor.hosts.length, `${processor.name} declares no hosts`).toBeGreaterThan(0)
    }
  })
})
