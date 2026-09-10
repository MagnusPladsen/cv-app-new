/** Message keys in the `auth` namespace. */
export type AuthErrorKey =
  | 'errorInvalid'
  | 'errorUnconfirmed'
  | 'errorTaken'
  | 'errorWeak'
  | 'errorRate'
  | 'errorGeneric'

/** What Supabase can be relied on to send. */
const BY_CODE: Record<string, AuthErrorKey> = {
  invalid_credentials: 'errorInvalid',
  email_not_confirmed: 'errorUnconfirmed',
  user_already_exists: 'errorTaken',
  email_exists: 'errorTaken',
  weak_password: 'errorWeak',
  same_password: 'errorWeak',
  over_email_send_rate_limit: 'errorRate',
  over_request_rate_limit: 'errorRate',
}

/**
 * Maps a Supabase auth error to something a person can act on.
 *
 * Supabase returns English prose written for developers ("Invalid login
 * credentials"), which is neither translated nor useful to a jobseeker.
 *
 * Keyed on `error.code` first, because that is the documented, stable
 * contract; the prose is not. Matching prose alone already failed once in
 * practice: a real rate-limit error reached a user as "something went wrong"
 * because the wording did not match what was expected. The message check
 * remains as a fallback for errors raised without a code.
 *
 * Anything unrecognised becomes `errorGeneric` on purpose: guessing at an
 * unfamiliar error risks telling someone their password is wrong when the
 * real problem is that the service is down.
 */
export function authErrorKey(error: { code?: string; message?: string } | string | undefined) {
  if (typeof error === 'string') return fromMessage(error)
  if (!error) return 'errorGeneric'

  const byCode = error.code ? BY_CODE[error.code] : undefined
  return byCode ?? fromMessage(error.message)
}

function fromMessage(message: string | undefined): AuthErrorKey {
  const text = (message ?? '').toLowerCase()

  if (text.includes('invalid login credentials')) return 'errorInvalid'
  if (text.includes('email not confirmed')) return 'errorUnconfirmed'
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'errorTaken'
  }
  if (text.includes('password should be') || text.includes('weak password')) return 'errorWeak'
  if (text.includes('rate limit') || text.includes('too many requests')) return 'errorRate'

  return 'errorGeneric'
}

export const MIN_PASSWORD_LENGTH = 8
