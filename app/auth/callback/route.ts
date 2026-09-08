import { NextResponse } from 'next/server'

import { readOAuthError } from '@/lib/auth/oauth-error'
import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * Carries the reason a sign-in failed to the error page. Without it every
 * failure looks the same, and the two likeliest causes - a callback URL
 * missing from the Supabase redirect allowlist, and a misconfigured provider
 * - are indistinguishable from the user simply changing their mind.
 */
function failed(origin: string, reason: string | null) {
  const url = new URL('/auth/auth-code-error', origin)
  if (reason) url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  // The provider reports refusal on the query string rather than by failing
  // the request, so this is checked before the missing-code branch.
  const reported = readOAuthError(searchParams)
  if (reported) return failed(origin, reported)

  const supabase = await getServerSupabase()
  if (!supabase) return failed(origin, 'supabase_not_configured')
  if (!code) return failed(origin, 'no_code')

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return failed(origin, error.message)
  }

  // Behind Vercel's load balancer the request origin is the internal host, so
  // the forwarded host is the one the user actually typed.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const base =
    process.env.NODE_ENV === 'development' || !forwardedHost ? origin : `https://${forwardedHost}`

  return NextResponse.redirect(`${base}${next}`)
}
