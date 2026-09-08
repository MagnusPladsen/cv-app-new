import { NextResponse } from 'next/server'

import { readSupabaseEnv } from '@/lib/supabase/env'

/**
 * Supabase pauses a free project after roughly a week with no requests at
 * all. A launched product never goes idle, but the gap before it has users
 * does, and a paused project makes every sign-in fail until somebody clicks
 * restore in the dashboard. One request a day removes the question.
 *
 * Vercel Hobby allows one cron run per day, which is well inside the
 * inactivity window.
 */
export async function GET(request: Request) {
  // Vercel signs cron requests with CRON_SECRET when it is set. Without this
  // check the endpoint is a free anonymous query against the database for
  // anyone who finds the URL.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const env = readSupabaseEnv()
  if (!env) return NextResponse.json({ ok: true, skipped: 'unconfigured' })

  // Any REST call counts as activity. RLS returns zero rows to an anonymous
  // caller, which is exactly what we want: proof of life, no data.
  const response = await fetch(`${env.url}/rest/v1/cv_documents?select=id&limit=1`, {
    headers: { apikey: env.publishableKey, Authorization: `Bearer ${env.publishableKey}` },
    cache: 'no-store',
  })

  return NextResponse.json({ ok: response.ok, status: response.status })
}
