import { NextResponse } from 'next/server'

import { readOAuthError } from '@/lib/auth/oauth-error'
import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

/** Where to send somebody whose address is confirmed but who is not signed in. */
function confirmedUrl(origin: string, request: Request, next: string) {
  const locale = /^\/(no|en)(\/|$)/.exec(next)?.[1] ?? 'no'
  const url = new URL(`/${locale}/login`, base(origin, request))
  url.searchParams.set('confirmed', '1')
  return url
}

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

/**
 * Behind Vercel's load balancer the request origin is the internal host, so
 * the forwarded host is the one the person actually typed.
 */
function base(origin: string, request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  return process.env.NODE_ENV === 'development' || !forwardedHost
    ? origin
    : `https://${forwardedHost}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))
  const confirming = searchParams.get('flow') === 'confirm'

  // The provider reports refusal on the query string rather than by failing
  // the request, so this is checked before the missing-code branch.
  const reported = readOAuthError(searchParams)
  if (reported) return failed(origin, reported)

  const supabase = await getServerSupabase()
  if (!supabase) return failed(origin, 'supabase_not_configured')
  if (!code) return failed(origin, 'no_code')

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // Confirming an address is done by Supabase before we are called: by the
    // time we see this, the account is live. The exchange fails only because
    // the link was opened somewhere other than the browser that signed up,
    // which has the code's verifier. Sending that person to an error page
    // tells them the opposite of what happened - so they go to the sign-in
    // page, told they are confirmed.
    if (confirming) return NextResponse.redirect(confirmedUrl(origin, request, next))
    return failed(origin, error.message)
  }

  return NextResponse.redirect(`${base(origin, request)}${next}`)
}
