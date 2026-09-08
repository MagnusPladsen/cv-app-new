import type { OAuthProvider } from '@/lib/supabase/env'

/**
 * Provider names are trademarks and are never translated: Google's and
 * Apple's brand guidelines both require the name to appear verbatim.
 */
export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
}
