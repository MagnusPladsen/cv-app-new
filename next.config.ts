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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // The honest weak point. Next's framework bootstrap is inline,
              // so 'self' alone blocks hydration: the page renders and then
              // does nothing, which e2e/csp.spec.ts catches. The strict fix is
              // a per-request nonce, but that has to be threaded through a
              // proxy that also runs next-intl and refreshes the Supabase
              // session, and a half-wired nonce there logs people out at
              // random. Tracked in docs/privacy/README.md.
              //
              // What still holds without it: connect-src limits where an
              // injected script could send anything, and object-src,
              // base-uri, form-action and frame-ancestors are unaffected.
              "script-src 'self' 'unsafe-inline'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              // Portraits are stored inline as data: URIs, and the export
              // iframe renders them the same way.
              "img-src 'self' data: blob:",
              "font-src 'self'",
              // Supabase auth and REST. Sign-in navigates away to the
              // provider, which form-action does not restrict.
              "connect-src 'self' https://*.supabase.co",
              // These two together, and the split matters. The CV's --cv-*
              // theme tokens are inline style *attributes*, which no nonce
              // can whitelist, so something has to allow them. Allowing them
              // via style-src-attr rather than putting 'unsafe-inline' in
              // style-src keeps inline <style> *blocks* forbidden, which is
              // the tighter of the two ways to make the CV render.
              //
              // Measured, not assumed: with style-src 'self' alone and no
              // style-src-attr, e2e/csp.spec.ts fails with "the accent token
              // was stripped" - every CV loses its colour, fonts and page
              // geometry, on screen and in the exported PDF.
              "style-src 'self'",
              "style-src-attr 'unsafe-inline'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
