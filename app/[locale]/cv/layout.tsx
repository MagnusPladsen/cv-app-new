import type { ReactNode } from 'react'

import { APP_PAGE } from '@/lib/seo'

/**
 * The editor and the CV list. Both are the application rather than the site:
 * nothing here is the same twice, and none of it is anybody's search result.
 * `robots.txt` asks crawlers not to fetch them; this is what keeps them out of
 * the index when somebody links to one anyway.
 */
export const metadata = APP_PAGE

export default function CvLayout({ children }: { children: ReactNode }) {
  return children
}
