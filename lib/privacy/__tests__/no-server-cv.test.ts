import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { sourceFiles } from './source-files'

/**
 * The privacy policy states that processing outside the EEA covers technical
 * data — IP addresses and sign-in cookies — and not CV content. That is true
 * because CVs never reach a server: they live in the browser, and sync goes
 * from the browser straight to Supabase in Frankfurt.
 *
 * Vercel functions execute in Washington DC. One Server Action, one route
 * handler that accepts a CV field, or one server-side PDF render would make
 * that sentence false, and nothing about the change would look like a privacy
 * decision at the time. These tests are what makes it look like one.
 */

const serverFiles = () =>
  [...sourceFiles('lib'), ...sourceFiles('app'), ...sourceFiles('components')].filter((file) => {
    const source = readFileSync(file, 'utf8')
    const isClient = /^['"]use client['"]/m.test(source)
    const isRouteOrServerModule =
      file.includes("server") || /route\.ts$/.test(file) || file === 'proxy.ts'
    return !isClient && isRouteOrServerModule
  })

describe('CV content never reaches a server', () => {
  it('uses no Server Actions', () => {
    // A Server Action taking a CV field would post it to Washington DC.
    const withServerDirective = [
      ...sourceFiles('lib'),
      ...sourceFiles('app'),
      ...sourceFiles('components'),
    ].filter((file) => /^['"]use server['"]/m.test(readFileSync(file, 'utf8')))

    expect(withServerDirective, 'add one and the EEA claim needs revisiting').toEqual([])
  })

  it('keeps the document store out of every server module', () => {
    // The store is the only thing holding real CV content.
    const offenders = serverFiles().filter((file) =>
      /from '@\/lib\/store\/documents'/.test(readFileSync(file, 'utf8')),
    )

    expect(offenders, `server modules importing the CV store: ${offenders.join(', ')}`).toEqual([])
  })

  it('has no route handler that reads a request body', () => {
    // Every route handler today is a redirect or a health check. One that
    // parsed JSON could accept a CV, and the policy would be wrong.
    const offenders = sourceFiles('app')
      .filter((file) => /route\.ts$/.test(file))
      .filter((file) => /request\.json\(\)/.test(readFileSync(file, 'utf8')))

    expect(offenders, `route handlers parsing a body: ${offenders.join(', ')}`).toEqual([])
  })

  it('renders a CV on the server only from the built-in demo document', () => {
    // /preview is a server component that renders every template. It must
    // keep using createDemoDocument - a fictional person - and never a real
    // one, which it could only obtain by one of the routes above anyway.
    const preview = readFileSync('app/[locale]/preview/page.tsx', 'utf8')

    expect(preview).toContain('createDemoDocument')
    expect(preview).not.toContain('useDocuments')
  })
})
