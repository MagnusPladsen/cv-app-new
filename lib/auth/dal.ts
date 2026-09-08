import 'server-only'

import { cache } from 'react'

import { getServerSupabase } from '@/lib/supabase/server'

/**
 * A DTO, not the Supabase user. That object carries app_metadata, identities
 * and provider tokens; none of it belongs in a client bundle, and returning
 * the whole thing is how it ends up there by accident.
 */
export type SessionUserDto = {
  id: string
  email: string | null
  provider: string | null
}

export const getSessionUser = cache(async (): Promise<SessionUserDto | null> => {
  const supabase = await getServerSupabase()
  if (!supabase) return null

  // getUser, not getSession: this drives what the page shows about the
  // account, so it should be the server's answer rather than a decoded cookie.
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    provider: (data.user.app_metadata?.provider as string | undefined) ?? null,
  }
})
