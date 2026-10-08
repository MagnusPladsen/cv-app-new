import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { sourceFiles } from './source-files'

/**
 * The privacy policy states that processing outside the EEA covers technical
 * data — IP addresses and sign-in cookies — and not CV content. That is true
 * because CVs never reach a server: they live in the browser, and sync goes
 * from the browser straight to Supabase in Frankfurt.
 *
 * One Server Action, one route handler that accepts a CV field, or one
 * server-side PDF render would make that sentence false, and nothing about the
 * change would look like a privacy decision at the time. These tests are what
 * makes it look like one.
 *
 * The functions run in Frankfurt now, which lowers the stakes but does not
 * remove them: the claim is that CV content never reaches a CVApp server at
 * all, not that it reaches one in a convenient country.
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

  it('has exactly one route handler that reads a request body', () => {
    // There used to be none, and the policy said CV content never reached a
    // server at all. The assistant changed that on purpose: /api/ai takes the
    // text a person pressed a button to send. Every other handler is still a
    // redirect or a health check, and a second one appearing here is a
    // privacy decision that needs the policy read again, not a merge.
    const offenders = sourceFiles('app')
      .filter((file) => /route\.ts$/.test(file))
      .filter((file) => /request\.json\(\)/.test(readFileSync(file, 'utf8')))

    expect(offenders, `route handlers parsing a body: ${offenders.join(', ')}`).toEqual([
      'app/api/ai/route.ts',
    ])
  })

  it('gives the assistant no way to accept a whole document', () => {
    // The request schema is the boundary. A `document`, `sections` or
    // `personalia` field in it would turn an opt-in press into a full upload,
    // and nothing else in the code would look different.
    const schema = readFileSync('lib/ai/request.ts', 'utf8')

    for (const forbidden of ['document', 'personalia', 'photo', 'firstName', 'email']) {
      expect(schema, `lib/ai/request.ts accepts a ${forbidden} field`).not.toMatch(
        new RegExp(`\\b${forbidden}\\s*:`),
      )
    }
  })

  it('bounds the CV text a review may carry', () => {
    // A review does send the CV's own text - it cannot say a bullet is weak
    // without reading it. Bounded rather than unlimited: forty passages of
    // four hundred characters is a long CV and a request that cannot become
    // an upload of everything.
    const schema = readFileSync('lib/ai/request.ts', 'utf8')

    expect(schema).toMatch(/passages: z\.array\(passageSchema\)\.max\(40\)/)
    expect(schema).toMatch(/text: z\.string\(\)\.max\(400\)/)
  })

  it('keeps the employers, dates and referees out of a review', () => {
    // Those are the parts of a CV that identify the user, their past
    // workplaces and - in the references - somebody who never agreed to any
    // of this. lib/ai/context.ts decides what goes; this is the reminder of
    // why the list is short.
    const context = readFileSync('lib/ai/context.ts', 'utf8')

    expect(context).toContain("if (section.type === 'references') continue")
    expect(context, 'a review started sending employers').not.toMatch(/entry\.organisation/)
    expect(context, 'a review started sending dates').not.toMatch(/entry\.from|entry\.to\b/)
  })

  it('strips identifiers in the browser, not on the server', () => {
    // scrub() runs client-side so the identifiers are gone before the request
    // exists. A 'server-only' import in it would mean they travel first and
    // are removed on arrival, which is a different promise entirely.
    const redact = readFileSync('lib/ai/redact.ts', 'utf8')

    expect(redact).not.toContain('server-only')
    expect(redact, 'the national id refusal is the one that cannot be undone').toContain(
      'NATIONAL_ID',
    )
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
