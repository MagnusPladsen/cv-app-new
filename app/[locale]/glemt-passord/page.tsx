import { getTranslations } from 'next-intl/server'

import { ResetRequestForm } from '@/components/auth/ResetRequestForm'
import { Link } from '@/i18n/navigation'

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('resetTitle')}</h1>
        <p className="text-muted-foreground">{t('resetLead')}</p>
      </div>
      <ResetRequestForm />
      <Link className="text-center text-sm font-semibold text-brand hover:underline" href="/login">
        {t('back')}
      </Link>
    </main>
  )
}
