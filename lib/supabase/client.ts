'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { readSupabaseEnv } from './env'

let cached: SupabaseClient | null = null

/**
 * Returns null when Supabase is unconfigured, which is the signed-out,
 * local-only mode the whole app has to keep working in. Callers branch on
 * null rather than throwing.
 *
 * The client is memoised: a second instance would open a second auth channel
 * and the two would fight over refreshing the same cookie.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (cached) return cached
  const env = readSupabaseEnv()
  if (!env) return null
  cached = createBrowserClient(env.url, env.publishableKey)
  return cached
}
