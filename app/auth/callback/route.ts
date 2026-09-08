import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  const supabase = await getServerSupabase()
  if (!supabase || !code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  // Behind Vercel's load balancer the request origin is the internal host, so
  // the forwarded host is the one the user actually typed.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const base =
    process.env.NODE_ENV === 'development' || !forwardedHost ? origin : `https://${forwardedHost}`

  return NextResponse.redirect(`${base}${next}`)
}
