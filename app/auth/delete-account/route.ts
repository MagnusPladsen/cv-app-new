import { NextResponse } from 'next/server'

import { getServerSupabase } from '@/lib/supabase/server'

/**
 * POST only, for the same reason as sign-out: a GET that destroys an account
 * can be fired by any image tag on any page.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url)
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
