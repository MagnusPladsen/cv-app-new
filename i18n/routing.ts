import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['no', 'en'],
  defaultLocale: 'no',
})

export type AppLocale = (typeof routing.locales)[number]
