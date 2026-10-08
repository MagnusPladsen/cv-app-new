import { describe, expect, it } from 'vitest'

import { APP_PAGE, pageMeta } from '@/lib/seo'

const meta = (path: string, locale = 'no') =>
  pageMeta({ locale, path, title: 'T', description: 'D' })

describe('a page’s identity to a search engine', () => {
  it('points its canonical at itself, not at the front page', () => {
    // The bug this file exists for: every page under the locale layout
    // inherited `canonical: /no`, which asks Google to drop it and index the
    // front page instead. /templates was in the sitemap and self-cancelling.
    expect(meta('/templates').alternates?.canonical).toBe(
      'http://localhost:3001/no/templates',
    )
    expect(meta('').alternates?.canonical).toBe('http://localhost:3001/no')
  })

  it('names the same page in the other language, not the other front page', () => {
    const languages = meta('/personvern').alternates?.languages as Record<string, string>

    expect(languages.no).toBe('http://localhost:3001/no/personvern')
    expect(languages.en).toBe('http://localhost:3001/en/personvern')
  })

  it('offers an x-default for a reader whose language is neither', () => {
    const languages = meta('/templates').alternates?.languages as Record<string, string>

    // The locale-less URL, which redirects on Accept-Language.
    expect(languages['x-default']).toBe('http://localhost:3001/templates')
  })

  it('tells each language its own locale, so a share card is not half Norwegian', () => {
    expect(meta('', 'no').openGraph?.locale).toBe('nb_NO')
    expect(meta('', 'en').openGraph?.locale).toBe('en_GB')
  })

  it('keeps the application pages out of the index but lets links through', () => {
    // follow: true because the editor links to the policy, and that link is
    // worth something. index: false because an indexed sign-in form is how a
    // site ends up ranking for its own name with a login box.
    expect(APP_PAGE.robots).toEqual({ index: false, follow: true })
  })
})
