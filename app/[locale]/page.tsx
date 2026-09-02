import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="text-5xl font-black tracking-tight text-balance sm:text-6xl">
        {t('app.tagline')}
      </h1>
      <p className="text-lg text-neutral-600">{t('app.name')}</p>
      <div>
        <Link
          className="inline-flex rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white"
          href="/cv"
        >
          {t('nav.myCvs')}
        </Link>
      </div>
    </main>
  )
}
