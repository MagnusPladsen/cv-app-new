import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { routing } from '@/i18n/routing'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'
import '../globals.css'

// shadcn's globals.css maps Tailwind's font-sans to --font-sans, so the
// next/font variable must use that exact name or body text falls back to serif.
const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CVApp',
  description: 'Free CV builder. No account, no watermark, no paywall.',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  return (
    <html lang={locale} className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/* The CV stylesheets are plain CSS in public/ so the print iframe can
            load the exact same files. See lib/print/stylesheets.ts. */}
        {CV_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
