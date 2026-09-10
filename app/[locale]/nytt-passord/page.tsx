import { getTranslations } from 'next-intl/server'

import { NewPasswordForm } from '@/components/auth/NewPasswordForm'

export default async function NewPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-center text-3xl font-bold tracking-tight">{t('newPasswordTitle')}</h1>
      <NewPasswordForm next={`/${locale}/account`} />
    </main>
  )
}
