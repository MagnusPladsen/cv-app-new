/**
 * Sending transactional email through Resend.
 *
 * Supabase's custom SMTP covers the emails GoTrue sends - confirmation, reset
 * - and nothing else. Anything the application sends itself goes through the
 * provider's own API, which is this.
 *
 * Deliberately tiny: no SDK, no templates, no queue. One POST. The only
 * message CVApp sends is the retention warning.
 */
export type Mail = {
  to: string
  subject: string
  text: string
}

export function readResendEnv(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RETENTION_FROM_EMAIL
  if (!apiKey || !from) return null
  return { apiKey, from }
}

/**
 * Returns whether the provider accepted it. A rejected message is not an
 * exception: the caller sends a batch, and one bad address must not stop the
 * other hundred and ninety-nine.
 */
export async function sendMail(
  mail: Mail,
  env: { apiKey: string; from: string },
): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
      cache: 'no-store',
    })
    return response.ok
  } catch {
    // A network failure is tomorrow's problem: nothing is marked warned, so
    // the same account comes back in the next run.
    return false
  }
}
