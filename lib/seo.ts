import type { Metadata } from 'next'

import { routing } from '@/i18n/routing'
import { siteUrl } from '@/lib/site'

/**
 * One page's identity to a search engine.
 *
 * The locale layout used to supply this for everything, which meant every page
 * under it declared `canonical: /no`. A canonical pointing at a different page
 * is an instruction to drop this one from the index, so /templates, /personvern
 * and /vilkar were in the sitemap and simultaneously telling Google they were
 * copies of the front page.
 *
 * A layout cannot know the path, so the path comes from the page.
 */
export function pageMeta({
  description,
  locale,
  path,
  title,
}: {
  description: string
  locale: string
  /** Below the locale, with a leading slash. Empty for the front page. */
  path: string
  title: string
}): Metadata {
  const base = siteUrl()
  const url = `${base}/${locale}${path}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(routing.locales.map((other) => [other, `${base}/${other}${path}`])),
        // The locale-less URL, which redirects by the reader's own language.
        // Google asks for one of these per hreflang set, for everybody whose
        // language matches neither.
        'x-default': `${base}${path}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'CVApp',
      title,
      description,
      url,
      locale: locale === 'no' ? 'nb_NO' : 'en_GB',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'CVApp' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image.png'],
    },
  }
}

/**
 * For the pages that are the application rather than the site: the editor, the
 * account, sign-in, password reset.
 *
 * `robots.txt` already asks crawlers not to fetch some of them, which is a
 * request not to *crawl*. This is the instruction not to *index*, and it is the
 * one that works when somebody links to a page from elsewhere. They carry no
 * content a searcher wants, and an indexed sign-in form is how a site ends up
 * ranking for its own brand name with a login box.
 */
export const APP_PAGE: Metadata = {
  robots: { index: false, follow: true },
}
