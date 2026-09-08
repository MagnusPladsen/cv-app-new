import type { Template } from '@/components/cv/types'
import { templateStylesheet } from '@/lib/print/stylesheets'
import { akademisk } from './akademisk'
import { aurora } from './aurora'
import { bergen } from './bergen'
import { fjord } from './fjord'
import { kompakt } from './kompakt'
import { kontrast } from './kontrast'
import { minimal } from './minimal'
import { nord } from './nord'
import { oslo } from './oslo'
import { portrett } from './portrett'
import { ramme } from './ramme'
import { studio } from './studio'
import { tidslinje } from './tidslinje'
import { trondheim } from './trondheim'

export const DEFAULT_TEMPLATE_ID = 'oslo'

/**
 * Every template the app can render, in gallery order.
 *
 * The `id` of each is frozen: it is stored in every saved CV as
 * `theme.templateId` and names that template's stylesheet, so renaming one
 * would orphan documents people already have. Display names live in the
 * template's `name` and can change freely - which is why the ids here still
 * read as place names while the gallery shows what each template looks like.
 */
export const TEMPLATES: Template[] = [
  oslo,
  trondheim,
  aurora,
  fjord,
  akademisk,
  kontrast,
  tidslinje,
  portrett,
  minimal,
  ramme,
  bergen,
  kompakt,
  nord,
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
