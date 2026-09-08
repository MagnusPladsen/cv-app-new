import { getTranslations } from 'next-intl/server'

import { SignInButtons } from '@/components/auth/SignInButtons'

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { locale } = await params
  const { next } = await searchParams
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16 sm:py-24">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('signInTitle')}</h1>
        <p className="text-muted-foreground">{t('signInLead')}</p>
      </div>
      <SignInButtons next={next ?? `/${locale}/cv`} />
    </main>
  )
}
