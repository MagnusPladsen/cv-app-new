import { Geist } from 'next/font/google'
import type { ReactNode } from 'react'

import '../globals.css'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })

/**
 * The auth endpoints live outside [locale] so the redirect URL registered with
 * Google and Apple is one URL rather than one per language. That puts them
 * outside the layout that supplies <html>, so this segment supplies its own.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
