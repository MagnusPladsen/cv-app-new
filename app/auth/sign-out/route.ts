import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * POST only. A GET sign-out can be triggered by any image tag on any page,
 * which is a real (if petty) way to log people out of an app.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const form = await request.formData().catch(() => null)
  const next = safeNextPath(form?.get('next')?.toString())

  const supabase = await getServerSupabase()
  await supabase?.auth.signOut()

  return NextResponse.redirect(`${origin}${next}`, { status: 303 })
}
