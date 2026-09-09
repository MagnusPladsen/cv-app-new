import type { MetadataRoute } from 'next'

import { routing } from '@/i18n/routing'
import { siteUrl } from '@/lib/site'

/** Public, indexable pages. The editor and account pages are per-user. */
const PATHS = [
  { path: '', priority: 1 },
  { path: '/templates', priority: 0.9 },
  { path: '/personvern', priority: 0.3 },
  { path: '/vilkar', priority: 0.3 },
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const lastModified = new Date()

  return routing.locales.flatMap((locale) =>
    PATHS.map(({ path, priority }) => ({
      url: `${base}/${locale}${path}`,
      lastModified,
      priority,
      // Each page exists in both languages; telling crawlers so stops them
      // treating the pair as duplicate content.
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((other) => [other, `${base}/${other}${path}`]),
        ),
      },
    })),
  )
}
