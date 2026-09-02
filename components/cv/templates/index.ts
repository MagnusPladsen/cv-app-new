import type { Template } from '@/components/cv/types'
import { templateStylesheet } from '@/lib/print/stylesheets'
import { oslo } from './oslo'

export const DEFAULT_TEMPLATE_ID = 'oslo'

/** Every template the app can render. Plan 3 adds the remaining eight. */
export const TEMPLATES: Template[] = [oslo]

/** Every template's stylesheet, for the app layout to load up front. */
export const ALL_TEMPLATE_STYLESHEETS: readonly string[] = TEMPLATES.map((template) =>
  templateStylesheet(template.id),
)

export function getTemplate(id: string): Template {
  return (
    TEMPLATES.find((template) => template.id === id) ??
    TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID)!
  )
}
