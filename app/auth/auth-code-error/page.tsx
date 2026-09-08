import Link from 'next/link'

import { normaliseOAuthReason } from '@/lib/auth/oauth-error'

/**
 * Outside [locale] with the rest of the auth endpoints, so it is deliberately
 * bilingual rather than translated: there is no locale in the URL to read.
 */
export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  // Normalised again here, not just at the callback: this page is reachable by
  // its URL, so the parameter cannot be assumed to have come from our redirect.
  const detail = normaliseOAuthReason(reason)

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Innloggingen ble avbrutt</h1>
      <p className="text-muted-foreground">
        Vi fikk ikke fullf\u00f8rt innloggingen. Pr\u00f8v igjen \u2014 CV-ene dine ligger trygt lagret lokalt.
      </p>
      <p className="text-sm text-muted-foreground">
        Sign-in could not be completed. Please try again; your CVs are safe on this device.
      </p>
      {detail ? (
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-words text-muted-foreground">
          {detail}
        </p>
      ) : null}
      <Link className="font-semibold text-brand hover:underline" href="/">
        CVApp
      </Link>
    </main>
  )
}
