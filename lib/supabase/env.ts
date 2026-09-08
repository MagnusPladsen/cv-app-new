export type OAuthProvider = 'google' | 'apple'

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['google', 'apple']

export type SupabaseEnv = { url: string; publishableKey: string }

/**
 * Next inlines NEXT_PUBLIC_* at build time only where it can see the literal
 * property access, so these reads must stay written out in full. Do not
 * refactor them into a loop over a list of names: the values come back
 * undefined in the browser bundle if you do.
 */
function defaultSource(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_AUTH_PROVIDERS: process.env.NEXT_PUBLIC_AUTH_PROVIDERS,
  }
}

function trimmed(value: string | undefined): string | null {
  const result = value?.trim()
  return result ? result : null
}

export function readSupabaseEnv(source = defaultSource()): SupabaseEnv | null {
  const url = trimmed(source.NEXT_PUBLIC_SUPABASE_URL)
  const publishableKey = trimmed(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}

export function isSupabaseConfigured(source = defaultSource()): boolean {
  return readSupabaseEnv(source) !== null
}

/**
 * Opt-in, never inferred. Having a Supabase project says nothing about which
 * providers are actually enabled in its dashboard, and a button that always
 * errors is worse than no button. The cost of this default is that enabling
 * Google without setting the variable shows no button - which the login page
 * states plainly, so it diagnoses itself.
 */
export function enabledProviders(source = defaultSource()): OAuthProvider[] {
  if (!readSupabaseEnv(source)) return []
  const raw = trimmed(source.NEXT_PUBLIC_AUTH_PROVIDERS)
  if (!raw) return []
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter((name): name is OAuthProvider => OAUTH_PROVIDERS.includes(name as OAuthProvider))
}
