import { Fragment } from 'react'
import { getCvLabels } from '@/lib/cv-labels'
import { DEFAULT_MARGIN_MM, PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData, Section } from '@/lib/schema/cv'
import { buildThemeTokens, themeTokensToStyle, type CvThemeStyle } from '@/lib/theme/tokens'
import { PersonaliaHeader } from './PersonaliaHeader'
import { renderSection } from './sections'
import { splitSections } from './split-sections'
import { HeaderBand } from './shells/HeaderBand'
import { SidebarLeft } from './shells/SidebarLeft'
import { SidebarRight } from './shells/SidebarRight'
import { SingleColumn } from './shells/SingleColumn'
import { getTemplate } from './templates'
import type { RenderContext, ShellId } from './types'

export const CV_DOC_CLASS = 'cv-doc'

const SHELLS: Record<ShellId, typeof SingleColumn> = {
  single: SingleColumn,
  'sidebar-left': SidebarLeft,
  'sidebar-right': SidebarRight,
  'header-band': HeaderBand,
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

  const split = splitSections(document.sections, template.sidebarSections)

  const render = (section: Section) => (
    <Fragment key={section.id}>{renderSection(section, context, template.overrides)}</Fragment>
  )

  const sections = split.main.map(render)
  const sidebar = split.sidebar.map(render)

  // The template class is what public/cv/templates/<id>.css scopes to.
  const classNames = [CV_DOC_CLASS, `${CV_DOC_CLASS}--${template.id}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classNames}
      style={style}
      lang={document.language}
    >
      <Shell
        header={<PersonaliaHeader personalia={document.personalia} />}
        sections={sections}
        sidebar={sidebar}
      />
    </div>
  )
}
