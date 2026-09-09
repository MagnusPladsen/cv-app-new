import { NextResponse } from 'next/server'

import { callerKey, rateLimit } from '@/lib/security/rate-limit'

import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * POST only. A GET sign-out can be triggered by any image tag on any page,
 * which is a real (if petty) way to log people out of an app.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url)

  const limited = rateLimit(callerKey(request, 'sign-out'), { limit: 10, windowMs: 60_000 })
  if (!limited.ok) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
    })
  }

  const form = await request.formData().catch(() => null)
  const next = safeNextPath(form?.get('next')?.toString())

  const supabase = await getServerSupabase()
  await supabase?.auth.signOut()

  return NextResponse.redirect(`${origin}${next}`, { status: 303 })
}
