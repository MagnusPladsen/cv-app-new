import { useTranslations } from 'next-intl'

export function BetaBadge() {
  const t = useTranslations('beta')

  return (
    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-strong uppercase">
      {t('badge')}
    </span>
  )
}
