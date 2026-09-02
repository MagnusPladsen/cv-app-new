import { Fragment } from 'react'
import { getCvLabels } from '@/lib/cv-labels'
import { DEFAULT_MARGIN_MM, PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { buildThemeTokens, themeTokensToStyle, type CvThemeStyle } from '@/lib/theme/tokens'
import { PersonaliaHeader } from './PersonaliaHeader'
import { renderSection } from './sections'
import { SingleColumn } from './shells/SingleColumn'
import { getTemplate } from './templates'
import type { RenderContext, ShellId } from './types'

export const CV_DOC_CLASS = 'cv-doc'

const SHELLS: Record<ShellId, typeof SingleColumn> = {
  single: SingleColumn,
  // Plan 2 adds the sidebar and header-band shells; until then every template
  // falls back to the single column so the app never renders a blank page.
  'sidebar-left': SingleColumn,
  'sidebar-right': SingleColumn,
  'header-band': SingleColumn,
}

export function CvDocument({
  document,
  className,
}: {
  document: CvDocumentData
  className?: string
}) {
  const template = getTemplate(document.theme.templateId)
  const tokens = buildThemeTokens(document.theme, template.tokens)
  const paper = PAPER[document.paper]

  const style: CvThemeStyle = {
    ...themeTokensToStyle(tokens),
    '--cv-page-width': `${paper.widthMm}mm`,
    '--cv-page-height': `${paper.heightMm}mm`,
    '--cv-margin': `${DEFAULT_MARGIN_MM}mm`,
  }

  const context: RenderContext = {
    labels: getCvLabels(document.language),
    levelDisplay: template.levelDisplay,
  }

  const Shell = SHELLS[template.shell]

  const sections = document.sections
    .filter((section) => section.enabled)
    .map((section) => (
      <Fragment key={section.id}>{renderSection(section, context, template.overrides)}</Fragment>
    ))

  return (
    <div
      className={className ? `${CV_DOC_CLASS} ${className}` : CV_DOC_CLASS}
      style={style}
      lang={document.language}
    >
      <Shell header={<PersonaliaHeader personalia={document.personalia} />} sections={sections} />
    </div>
  )
}
