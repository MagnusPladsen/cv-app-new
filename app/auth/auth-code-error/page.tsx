import Link from 'next/link'

/**
 * Outside [locale] with the rest of the auth endpoints, so it is deliberately
 * bilingual rather than translated: there is no locale in the URL to read.
 */
export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Innloggingen ble avbrutt</h1>
      <p className="text-muted-foreground">
        Vi fikk ikke fullført innloggingen. Prøv igjen — CV-ene dine ligger trygt lagret lokalt.
      </p>
      <p className="text-sm text-muted-foreground">
        Sign-in could not be completed. Please try again; your CVs are safe on this device.
      </p>
      <Link className="font-semibold text-brand hover:underline" href="/">
        CVApp
      </Link>
    </main>
  )
}
