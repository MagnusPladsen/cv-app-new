import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { readSupabaseEnv } from './env'

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const env = readSupabaseEnv()
  if (!env) return null

  const cookieStore = await cookies()

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies. Ignored on purpose: the
          // proxy refreshes the session on every request, so a dropped write
          // here costs nothing.
        }
      },
    },
  })
}
