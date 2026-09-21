import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * The other half of confirming an email address.
 *
 * `/auth/callback` exchanges a one-time `code` for a session, which only
 * works in the browser that started the sign-up: the code's verifier is in
 * that browser's storage. People open email in whichever app their phone
 * decided on, so the link lands in a different browser about as often as not,
 * and the confirmation then fails with nothing to show for it - the address
 * is confirmed, but nobody is signed in and nothing says so.
 *
 * A `token_hash` needs no verifier. Point Supabase's email templates here:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *
 * and the link works wherever it is opened.
 */

const TYPES: EmailOtpType[] = ['email', 'signup', 'invite', 'magiclink', 'recovery', 'email_change']

function failed(origin: string, reason: string) {
  const url = new URL('/auth/auth-code-error', origin)
  url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeNextPath(searchParams.get('next'), '/')

  if (!tokenHash) return failed(origin, 'no_token')
  if (!type || !TYPES.includes(type as EmailOtpType)) return failed(origin, 'bad_type')

  const supabase = await getServerSupabase()
  if (!supabase) return failed(origin, 'supabase_not_configured')

  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  })
  if (error) return failed(origin, error.message)

  // Behind Vercel's load balancer the request origin is the internal host, so
  // the forwarded host is the one the person actually typed.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const base =
    process.env.NODE_ENV === 'development' || !forwardedHost ? origin : `https://${forwardedHost}`

  return NextResponse.redirect(`${base}${next}`)
}
