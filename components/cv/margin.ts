import type { CvDocument } from '@/lib/schema/cv'
import { buildThemeTokens } from '@/lib/theme/tokens'
import { getTemplate } from './templates'

/**
 * The page margin a document actually renders with. A template may tighten it,
 * so page counting and the break guides must ask rather than assume.
 */
export function documentMarginMm(document: CvDocument): number {
  const template = getTemplate(document.theme.templateId)
  return buildThemeTokens(document.theme, template.tokens).marginMm
}
