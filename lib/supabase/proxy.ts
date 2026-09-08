import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

import { readSupabaseEnv } from './env'

/**
 * Refreshes the Supabase session and writes the rotated cookies onto a
 * response that next-intl has already built.
 *
 * The order matters and is the whole reason this is a helper rather than a
 * second proxy: next-intl owns the response (it may be a redirect, and it
 * carries the locale headers), so Supabase's cookies are attached to that
 * object instead of a fresh NextResponse.next(). Building a new response here
 * would silently drop either the locale handling or the refreshed session.
 */
export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const env = readSupabaseEnv()
  if (!env) return response

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // This call is the point of the whole function: it is what rotates an
  // expiring token. getClaims verifies the JWT locally against the cached
  // JWKS, so it costs no network round trip on the happy path - unlike
  // getUser, which does. Do not put code between the client creation and this
  // call; anything that throws in between leaves users randomly signed out.
  await supabase.auth.getClaims()

  return response
}
