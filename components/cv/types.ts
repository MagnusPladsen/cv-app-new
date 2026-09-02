import type { ReactNode } from 'react'
import type { CvLabels } from '@/lib/cv-labels'
import type { Section, SectionType } from '@/lib/schema/cv'
import type { ThemeTokenValues } from '@/lib/theme/tokens'

export type ShellId = 'single' | 'sidebar-left' | 'sidebar-right' | 'header-band'

/** Whether skill and language levels render as a bar or as a word. */
export type LevelDisplay = 'bar' | 'text'

export type RenderContext = {
  labels: CvLabels
  levelDisplay: LevelDisplay
}

export type SectionRendererProps = {
  section: Section
  context: RenderContext
}

export type SectionRenderer = (props: SectionRendererProps) => ReactNode

export type Template = {
  id: string
  /** Display name in the template gallery. Not localized: these are proper names. */
  name: string
  shell: ShellId
  defaultAccent: string
  /** Curated accents offered for this template, before the colour picker. */
  swatches: string[]
  levelDisplay: LevelDisplay
  /** Token overrides layered on top of the neutral defaults. */
  tokens?: Partial<ThemeTokenValues>
  /** For sidebar shells: which sections live in the sidebar. */
  sidebarSections?: SectionType[]
  /** Escape hatch for a template that needs a bespoke renderer. */
  overrides?: Partial<Record<SectionType, SectionRenderer>>
}
