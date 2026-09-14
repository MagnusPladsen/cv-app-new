import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { warningEmail } from '@/lib/retention/message'
import { BATCH_SIZE, GRACE_DAYS, INACTIVE_MONTHS } from '@/lib/retention/policy'

const migration = readFileSync('supabase/migrations/20260914000003_retention.sql', 'utf8')
const route = readFileSync('app/api/retention/route.ts', 'utf8')

describe('the retention schedule', () => {
  it('promises in the email exactly what the SQL enforces', () => {
    // The email is a statement about what will happen to someone's data. If
    // the constants and the migration drift, it becomes a false one, and the
    // person finds out by losing their CVs early.
    expect(migration).toContain(`interval '${INACTIVE_MONTHS} months'`)
    expect(migration).toContain(`interval '${GRACE_DAYS} days'`)
    expect(migration).toContain(`limit ${BATCH_SIZE}`)
  })

  it('says what will happen, when, and how to stop it — in both languages', () => {
    const { subject, text } = warningEmail('https://cv.pladsen.dev')

    for (const half of ['Hei,', 'Hi,']) expect(text).toContain(half)
    expect(subject).toContain(String(GRACE_DAYS))
    expect(text).toContain(String(INACTIVE_MONTHS))
    expect(text).toContain('https://cv.pladsen.dev')
    // Signing in is the whole remedy, and the mail has to say so in both.
    expect(text).toMatch(/logge inn/)
    expect(text).toMatch(/sign in/)
  })

  it('tells people their locally stored CVs survive', () => {
    // Most CVApp users never make an account. Someone reading "we will delete
    // every CV on it" needs to know that the ones in their browser are not
    // covered, or the mail reads as a threat to work it cannot touch.
    const { text } = warningEmail('https://cv.pladsen.dev')
    expect(text).toMatch(/lokalt i nettleseren/)
    expect(text).toMatch(/locally in your browser/)
  })
})

describe('the retention job', () => {
  it('holds no privileged Supabase key', () => {
    // The whole design. A service-role key here would be able to read every
    // CV in the database, which is the thing the privacy policy says cannot
    // happen. The job presents the publishable key and a secret that only
    // these three functions accept.
    expect(route).not.toMatch(/SERVICE_ROLE|service_role/)
    expect(route).toContain('readSupabaseEnv')
  })

  it('refuses to run rather than half-run', () => {
    // Deleting accounts while unable to email them inverts the schedule:
    // people would lose data having never been told.
    expect(route).toMatch(/if \(!env \|\| !jobSecret \|\| !resend\)/)
    expect(route).toContain("skipped: 'unconfigured'")
  })

  it('starts the clock only on a warning that was actually accepted', () => {
    expect(route).toMatch(/if \(sent\) warned\.push/)
  })

  it('is not an open trigger for deleting accounts', () => {
    expect(route).toContain('CRON_SECRET')
    expect(route).toContain("new NextResponse('Unauthorized', { status: 401 })")
    expect(route).toContain("new NextResponse('Not configured', { status: 503 })")
  })

  it('puts no email address in a log or a response', () => {
    // A Vercel log line holding an address would be a copy of personal data
    // outside the database, retained on someone else's schedule.
    expect(route).not.toMatch(/console\.(log|info|warn|error)/)

    // The body it returns, rather than the file: `email` appears in the type
    // and in the call that sends the mail, both of which are the job working.
    const body = route.slice(route.lastIndexOf('return NextResponse.json('))
    expect(body).not.toContain('email')
    expect(body).not.toContain('user_id')
  })
})

describe('the migration', () => {
  it('gates every function on the secret', () => {
    const functions = [...migration.matchAll(/create or replace function public\.(\w+)/g)].map(
      (match) => match[1]!,
    )
    expect(functions.length).toBeGreaterThanOrEqual(3)

    // A definer function granted to anon without the check is an anonymous
    // account-deletion endpoint.
    for (const name of functions) {
      const body = migration.slice(migration.indexOf(`function public.${name}`))
      expect(body.slice(0, 900), `${name} does not check the secret`).toContain(
        'perform private.assert_job_secret',
      )
    }
  })

  it('never returns anything but an id and an address', () => {
    // retention_due is the only function that returns rows. If it ever grew a
    // join onto cv_documents, the job would be reading CVs.
    expect(migration).toContain('returns table (user_id uuid, email text)')
    expect(migration).not.toMatch(/cv_documents/)
  })

  it('keeps the notices table unreadable through the API', () => {
    expect(migration).toContain('alter table public.retention_notices enable row level security')
    expect(migration).toMatch(
      /revoke all on table public\.retention_notices from public, anon, authenticated/,
    )
    // RLS with no policy is the point: the definer functions bypass it and
    // nothing else gets in. A policy here would be a way in.
    expect(migration).not.toMatch(/create policy[\s\S]*retention_notices/)
  })

  it('lets a returning sign-in cancel a pending deletion', () => {
    // Someone who comes back after two years must not be deleted a week later
    // because their warning row outlived the visit.
    expect(migration).toMatch(/delete from public\.retention_notices[\s\S]{0,400}>= now\(\)/)
  })
})
