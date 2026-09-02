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
  /**
   * The pairing this template is designed around. Applied when a CV is created
   * from the template; the user can still change it afterwards.
   */
  defaultFontPairId?: string
}

export type SectionRendererProps = {
  section: Section
  context: RenderContext
}

export type SectionRenderer = (props: SectionRendererProps) => ReactNode

/**
 * Section types that survive a ~52mm sidebar. Everything else - experience,
 * education, certifications, references - carries long names that wrap to one
 * word per line in a narrow column, which reads as broken.
 */
export const SIDEBAR_SAFE_SECTIONS = [
  'skills',
  'languages',
  'interests',
  'drivingLicence',
] as const satisfies readonly SectionType[]

export type SidebarSafeSection = (typeof SIDEBAR_SAFE_SECTIONS)[number]

export type Template = {
  id: string
  /** Display name in the template gallery. Not localized: these are proper names. */
  name: string
  shell: ShellId
  defaultAccent: string
  /** Curated accents offered for this template, before the colour picker. */
  swatches: string[]
  levelDisplay: LevelDisplay
  /**
   * The pairing this template is designed around. Applied when a CV is created
   * from the template; the user can still change it afterwards.
   */
  defaultFontPairId?: string
  /** Token overrides layered on top of the neutral defaults. */
  tokens?: Partial<ThemeTokenValues>
  /** For sidebar shells: which sections live in the sidebar. */
  sidebarSections?: SidebarSafeSection[]
  /** Escape hatch for a template that needs a bespoke renderer. */
  overrides?: Partial<Record<SectionType, SectionRenderer>>
}
