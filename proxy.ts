import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { routing } from './i18n/routing'
import { updateSupabaseSession } from './lib/supabase/proxy'

const handleI18n = createMiddleware(routing)

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request)
  return updateSupabaseSession(request, response)
}

export const config = {
  // `auth` joins the exclusions: /auth/callback is a machine endpoint that
  // must never be rewritten to /no/auth/callback, or the redirect URL
  // registered with Google and Apple stops matching.
  matcher: '/((?!api|auth|_next|_vercel|.*\\..*).*)',
}
