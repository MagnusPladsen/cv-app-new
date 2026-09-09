import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import packageJson from '../../../package.json'
import { sourceFiles } from './source-files'

const TRACKING_PACKAGES = [
  '@vercel/analytics',
  '@vercel/speed-insights',
  'posthog-js',
  '@sentry/nextjs',
  '@sentry/react',
  '@sentry/browser',
  'mixpanel-browser',
  'react-ga',
  'react-ga4',
  '@amplitude/analytics-browser',
  'plausible-tracker',
  '@datadog/browser-rum',
  'hotjar',
  'logrocket',
]

describe('privacy posture', () => {
  it('ships no analytics or error-tracking dependency', () => {
    // Not a style preference. With no non-essential storage, CVApp needs no
    // consent banner under ekomloven § 3-15. Adding any of these changes the
    // legal position and would require a consent manager with an
    // equal-prominence reject - so it has to be a deliberate decision, not an
    // npm install nobody noticed.
    const installed = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    } as Record<string, string>

    const present = TRACKING_PACKAGES.filter((name) => name in installed)
    expect(present, `tracking dependency added: ${present.join(', ')}`).toEqual([])
  })

  it('does not log CV content or personal data', () => {
    // A console.log of a document ends up in the hosting provider's server
    // logs - in this case in the United States - which is CV content in a
    // place the data inventory does not account for.
    const offenders: string[] = []

    for (const dir of ['lib', 'components', 'app']) {
      for (const file of sourceFiles(dir)) {
        for (const [index, line] of readFileSync(file, 'utf8').split('\n').entries()) {
          if (!/console\.(log|info|debug|warn|error)/.test(line)) continue
          if (/\b(document|doc|personalia|cv|user|session|token|body|email)\b/i.test(line)) {
            offenders.push(`${file}:${index + 1}  ${line.trim()}`)
          }
        }
      }
    }

    expect(offenders, `possible personal data in logs:\n${offenders.join('\n')}`).toEqual([])
  })

  it('never logs a caught error object whole', () => {
    // The word-list check above does not catch this, and the realistic leak
    // is exactly this shape: a rejected Supabase call carries the request it
    // failed on, and that request body is the CV. Logging `error` prints it;
    // logging `error.message` does not.
    const offenders: string[] = []

    for (const dir of ['lib', 'components', 'app']) {
      for (const file of sourceFiles(dir)) {
        for (const [index, line] of readFileSync(file, 'utf8').split('\n').entries()) {
          const call = /console\.(?:log|info|debug|warn|error)\(([^)]*)\)/.exec(line)
          if (!call) continue
          // A bare identifier argument - error, err, e, response, data.
          const bare = call[1]!
            .split(',')
            .map((argument) => argument.trim())
            .filter((argument) => /^(error|err|e|response|res|data|payload)$/.test(argument))
          if (bare.length > 0) offenders.push(`${file}:${index + 1}  ${line.trim()}`)
        }
      }
    }

    expect(offenders, `whole error objects logged:\n${offenders.join('\n')}`).toEqual([])
  })
})
