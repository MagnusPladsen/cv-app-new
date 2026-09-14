import { NextResponse } from 'next/server'

import { readResendEnv, sendMail } from '@/lib/email/resend'
import { warningEmail } from '@/lib/retention/message'
import { callerKey, rateLimit } from '@/lib/security/rate-limit'
import { siteUrl } from '@/lib/site'
import { readSupabaseEnv } from '@/lib/supabase/env'

/**
 * The retention job. Runs once a day: warn the accounts that have been
 * inactive for two years, then delete the ones warned a month ago that are
 * still inactive.
 *
 * This function holds no Supabase key beyond the publishable one every visitor
 * already has. The work happens in three `security definer` functions that
 * check a shared secret themselves - see the migration for why. What that buys
 * is that nothing here, and nothing a leak of anything here would allow, can
 * read a CV.
 *
 * Nothing personal is logged or returned. The response carries counts, because
 * an email address in a Vercel log would be the one copy of it outside the
 * database.
 */
export const dynamic = 'force-dynamic'

type Candidate = { user_id: string; email: string }

async function rpc(env: { url: string; publishableKey: string }, fn: string, body: unknown) {
  const response = await fetch(`${env.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: env.publishableKey,
      Authorization: `Bearer ${env.publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    // The message may name the function but never its arguments: the secret is
    // one of them.
    throw new Error(`${fn} failed: ${response.status}`)
  }
  return response.json()
}

export async function GET(request: Request) {
  const limited = rateLimit(callerKey(request, 'retention'), { limit: 5, windowMs: 60_000 })
  if (!limited.ok) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
    })
  }

  // Same guard as the keep-alive cron. Unauthenticated in production would be
  // an open trigger for account deletion, so refuse rather than run.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Not configured', { status: 503 })
    }
  } else if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const env = readSupabaseEnv()
  const jobSecret = process.env.SUPABASE_RETENTION_SECRET
  const resend = readResendEnv()

  // All three or nothing. Deleting accounts while unable to warn them would
  // invert the whole point of the schedule.
  if (!env || !jobSecret || !resend) {
    return NextResponse.json({ ok: true, skipped: 'unconfigured' })
  }

  const due = (await rpc(env, 'retention_due', { job_secret: jobSecret })) as Candidate[]

  const warned: string[] = []
  for (const candidate of due) {
    const mail = warningEmail(siteUrl())
    const sent = await sendMail(
      { to: candidate.email, subject: mail.subject, text: mail.text },
      resend,
    )
    // Only a delivered warning starts the clock. An account whose email
    // bounced is offered again tomorrow, and never deleted unwarned.
    if (sent) warned.push(candidate.user_id)
  }

  if (warned.length > 0) {
    await rpc(env, 'retention_mark_warned', { job_secret: jobSecret, ids: warned })
  }

  const deleted = (await rpc(env, 'retention_delete_expired', {
    job_secret: jobSecret,
  })) as number

  return NextResponse.json({
    ok: true,
    due: due.length,
    warned: warned.length,
    failed: due.length - warned.length,
    deleted,
  })
}
