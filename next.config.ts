import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  /**
   * Response headers required by the privacy spec's security section.
   *
   * Content-Security-Policy is deliberately absent here and lives in its own
   * change: a naive policy breaks the CV silently, because the theme tokens
   * are inline style attributes and the export renders through a srcdoc
   * iframe that inherits whatever the page is given.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            // The app asks for none of these. Denying them limits what an
            // injected script could reach for.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Someone else's page must not frame a CV. This governs being
          // framed, not framing, so the export iframe is unaffected.
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
