/**
 * The site's public origin.
 *
 * Absolute URLs are needed in three places that cannot use a relative path:
 * Open Graph image URLs, the sitemap, and the robots sitemap reference. Vercel
 * exposes the deployment host, which keeps preview deployments self-consistent
 * instead of advertising production.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercel) return `https://${vercel}`

  const deployment = process.env.VERCEL_URL?.trim()
  if (deployment) return `https://${deployment}`

  return 'http://localhost:3001'
}
