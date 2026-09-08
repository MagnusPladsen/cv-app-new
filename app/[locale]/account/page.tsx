import { getTranslations } from 'next-intl/server'

import { AccountPanel } from '@/components/auth/AccountPanel'
import { SignInButtons } from '@/components/auth/SignInButtons'
import { getSessionUser } from '@/lib/auth/dal'

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  const user = await getSessionUser()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('accountTitle')}</h1>
      {user ? <AccountPanel user={user} /> : <SignInButtons next={`/${locale}/account`} />}
    </main>
  )
}
