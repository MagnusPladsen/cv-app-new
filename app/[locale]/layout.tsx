import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { SessionProvider } from '@/components/auth/SessionProvider'
import { AppFooter } from '@/components/chrome/AppFooter'
import { AppHeader } from '@/components/chrome/AppHeader'
import { ALL_TEMPLATE_STYLESHEETS } from '@/components/cv/templates'
import { routing } from '@/i18n/routing'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'
import { siteUrl } from '@/lib/site'
import '../globals.css'

// shadcn's globals.css maps Tailwind's font-sans to --font-sans, so the
// next/font variable must use that exact name or body text falls back to serif.
const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })

/**
 * Per-locale metadata. Sharing a link previously produced a bare URL with no
 * title, description or image, because the app declared none of the Open
 * Graph tags. `app/opengraph-image.png` is picked up by file convention.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const url = `${siteUrl()}/${locale}`

  return {
    metadataBase: new URL(siteUrl()),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        routing.locales.map((other) => [other, `${siteUrl()}/${other}`]),
      ),
    },
    openGraph: {
      type: 'website',
      siteName: 'CVApp',
      title: t('title'),
      description: t('description'),
      url,
      locale: locale === 'no' ? 'nb_NO' : 'en_GB',
      // Referenced explicitly rather than left to the file convention. The
      // pages live under a dynamic [locale] segment, and the convention
      // generates a URL with the unprovided param filled in as "/-/" - which
      // works, but is a strange address to hand a crawler. The file sits in
      // the root segment so this path is stable, and metadataBase makes it
      // absolute.
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'CVApp' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/opengraph-image.png'],
    },
  }
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
        {[...CV_STYLESHEETS, ...ALL_TEMPLATE_STYLESHEETS].map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      {/* Not a flex column: `mx-auto` on a flex item shrinks it to fit rather
          than filling and then capping, so every max-w-* container collapsed. */}
      <body className="min-h-full">
        <NextIntlClientProvider>
          <SessionProvider>
            <AppHeader />
            {children}
            <AppFooter />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
