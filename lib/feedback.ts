/**
 * Where beta feedback goes.
 *
 * There is no backend yet, so feedback opens the user's mail client. Set
 * NEXT_PUBLIC_FEEDBACK_EMAIL to receive it; without that, the UI says plainly
 * that feedback is not wired up rather than pretending to send it.
 */
export const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ?? ''

export function feedbackMailto(message: string, subject: string): string | null {
  if (!FEEDBACK_EMAIL) return null

  const query = new URLSearchParams({ subject, body: message })
  return `mailto:${FEEDBACK_EMAIL}?${query.toString()}`
}
