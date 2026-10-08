import { TEMPLATES } from '@/components/cv/templates'
import { siteUrl } from '@/lib/site'

/**
 * What the front page is, in the vocabulary a search engine reads.
 *
 * Only claims the app can back: it is free, it needs no account, it runs in a
 * browser, and there are this many templates - counted from the registry
 * rather than typed, so the number cannot drift. No invented ratings, no
 * review counts, no author organisation that does not exist.
 */
export function StructuredData({ description, locale, title }: {
  description: string
  locale: string
  title: string
}) {
  const base = siteUrl()
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: `${base}/${locale}`,
        name: 'CVApp',
        description,
        inLanguage: locale === 'no' ? 'nb-NO' : 'en-GB',
      },
      {
        '@type': 'WebApplication',
        '@id': `${base}/#app`,
        name: 'CVApp',
        url: `${base}/${locale}`,
        description: title,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        inLanguage: ['nb-NO', 'en-GB'],
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'NOK' },
        featureList: [
          `${TEMPLATES.length} CV templates`,
          'PDF export with selectable text',
          'Works without an account',
          'Import from an existing PDF or Word CV',
        ],
      },
    ],
  }

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      type="application/ld+json"
    />
  )
}
