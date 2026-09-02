import type { Template } from '@/components/cv/types'
import { templateStylesheet } from '@/lib/print/stylesheets'
import { akademisk } from './akademisk'
import { aurora } from './aurora'
import { bergen } from './bergen'
import { fjord } from './fjord'
import { kompakt } from './kompakt'
import { nord } from './nord'
import { oslo } from './oslo'
import { studio } from './studio'
import { trondheim } from './trondheim'

export const DEFAULT_TEMPLATE_ID = 'oslo'

/** Every template the app can render. */
export const TEMPLATES: Template[] = [
  oslo,
  bergen,
  kompakt,
  fjord,
  nord,
  trondheim,
  aurora,
  akademisk,
  studio,
]

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
