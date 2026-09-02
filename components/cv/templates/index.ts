import type { Template } from '@/components/cv/types'
import { oslo } from './oslo'

export const DEFAULT_TEMPLATE_ID = 'oslo'

/** Every template the app can render. Plan 3 adds the remaining eight. */
export const TEMPLATES: Template[] = [oslo]

export function getTemplate(id: string): Template {
  return (
    TEMPLATES.find((template) => template.id === id) ??
    TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID)!
  )
}
