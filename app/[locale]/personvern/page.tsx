import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { LegalDocumentView } from '@/components/legal/LegalDocumentView'
import { PRIVACY_POLICY } from '@/lib/legal'
import { routing } from '@/i18n/routing'

export const metadata: Metadata = {
  title: 'Personvern — CVApp',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale !== 'no' && locale !== 'en') notFound()
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'legal' })

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <LegalDocumentView
        document={PRIVACY_POLICY[locale]}
        locale={locale}
        processorHeadings={{
          name: t('processorName'),
          purpose: t('processorPurpose'),
          country: t('processorCountry'),
          dpa: t('processorDpa'),
        }}
      />
    </main>
  )
}
