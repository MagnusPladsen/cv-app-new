import type { CvLanguage } from '@/lib/schema/cv'
import { en } from './en'
import { no } from './no'
import type { CvLabels } from './types'

export type { CvLabels } from './types'

export const CV_LABELS: Record<CvLanguage, CvLabels> = { no, en }

export function getCvLabels(language: CvLanguage): CvLabels {
  return CV_LABELS[language]
}
