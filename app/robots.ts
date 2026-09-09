import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site'

/**
 * Note: Cloudflare sits in front of production and injects its own
 * content-signals robots.txt, which currently shadows this one. It is kept
 * because it is correct, it applies on any other host, and it is where the
 * rules belong if that Cloudflare feature is turned off.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // A developer proof sheet, already marked noindex.
        '/no/preview',
        '/en/preview',
        // Machine endpoints and per-user pages: nothing to index, and
        // crawling them just generates failed sign-ins.
        '/auth/',
        '/api/',
        '/no/account',
        '/en/account',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
