import type { ReactNode } from 'react'

/**
 * Pass-through root layout. The real <html> element lives in
 * app/[locale]/layout.tsx, because it needs the resolved locale.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
