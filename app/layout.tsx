import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { siteUrl } from '@/lib/site'

/**
 * Only metadataBase. Routes outside [locale] - the auth endpoints and their
 * error page - have no generateMetadata of their own, and without this Next
 * resolves their absolute URLs against localhost:3000 and says so on every
 * build.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
}

/**
 * Pass-through root layout. The real <html> element lives in
 * app/[locale]/layout.tsx, because it needs the resolved locale.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
