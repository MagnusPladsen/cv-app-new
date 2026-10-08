import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { pageMeta } from '@/lib/seo'

/**
 * The gallery is a client component, so its metadata lives here.
 *
 * It needs its own: it is the page somebody searching "CV-mal" should land on,
 * and until now it carried the front page's title and a canonical pointing at
 * the front page - which asks Google to drop it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return pageMeta({
    locale,
    path: '/templates',
    title: t('templatesTitle'),
    description: t('templatesDescription'),
  })
}

export default function TemplatesLayout({ children }: { children: ReactNode }) {
  return children
}
