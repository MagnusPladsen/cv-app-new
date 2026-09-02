import type { LanguageLevel, SectionType, SkillLevel } from '@/lib/schema/cv'

export type CvLabels = {
  sections: Record<SectionType, string>
  skillLevels: Record<SkillLevel, string>
  languageLevels: Record<LanguageLevel, string>
  /** Shown in place of an end date for a current role. */
  present: string
  /** Twelve abbreviated month names, January first. */
  months: string[]
  referencesOnRequest: string
  drivingLicenceClass: string
}
