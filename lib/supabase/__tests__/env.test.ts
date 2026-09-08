import { describe, expect, it } from 'vitest'

import { enabledProviders, isSupabaseConfigured, readSupabaseEnv } from '@/lib/supabase/env'

const full = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://ref.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
}

describe('readSupabaseEnv', () => {
  it('returns null when nothing is configured', () => {
    expect(readSupabaseEnv({})).toBeNull()
    expect(isSupabaseConfigured({})).toBe(false)
  })

  it('returns null when only half the pair is present', () => {
    expect(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: full.NEXT_PUBLIC_SUPABASE_URL })).toBeNull()
  })

  it('reads a complete pair', () => {
    expect(readSupabaseEnv(full)).toEqual({
      url: 'https://ref.supabase.co',
      publishableKey: 'sb_publishable_abc',
    })
  })

  it('treats a blank string as unset, because Vercel writes empty vars', () => {
    expect(readSupabaseEnv({ ...full, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '  ' })).toBeNull()
  })
})

describe('enabledProviders', () => {
  it('offers no providers when Supabase is unconfigured', () => {
    expect(enabledProviders({ NEXT_PUBLIC_AUTH_PROVIDERS: 'google,apple' })).toEqual([])
  })

  it('offers nothing until a provider is explicitly named', () => {
    // A button for a provider that is not switched on in the Supabase
    // dashboard fails at the worst possible moment, after the user has
    // committed to signing in. Silence is the safer default.
    expect(enabledProviders(full)).toEqual([])
    expect(enabledProviders({ ...full, NEXT_PUBLIC_AUTH_PROVIDERS: '' })).toEqual([])
  })

  it('reads an explicit list, ignoring unknown names and whitespace', () => {
    const source = { ...full, NEXT_PUBLIC_AUTH_PROVIDERS: ' apple , google , github ' }
    expect(enabledProviders(source)).toEqual(['apple', 'google'])
  })
})
