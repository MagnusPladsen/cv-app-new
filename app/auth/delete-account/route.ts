import { NextResponse } from 'next/server'

import { callerKey, rateLimit } from '@/lib/security/rate-limit'

import { getServerSupabase } from '@/lib/supabase/server'

/**
 * POST only, for the same reason as sign-out: a GET that destroys an account
 * can be fired by any image tag on any page.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url)

  const limited = rateLimit(callerKey(request, 'delete-account'), { limit: 5, windowMs: 60_000 })
  if (!limited.ok) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
    })
  }

  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.redirect(`${origin}/`, { status: 303 })

  const { error } = await supabase.rpc('delete_own_account')
  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`, { status: 303 })
  }

  // The account is gone, so the cookies pointing at it must go too. The local
  // copies are cleared by SessionProvider on SIGNED_OUT.
  await supabase.auth.signOut()
  return NextResponse.redirect(`${origin}/`, { status: 303 })
}
