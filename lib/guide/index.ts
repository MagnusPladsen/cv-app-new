import { GUIDE_EN } from './guide-en'
import { GUIDE_NO } from './guide-no'
import type { GuideDocument } from './types'

export type { GuideDocument, GuideQuestion, GuideSection } from './types'

export const GUIDE: Record<'no' | 'en', GuideDocument> = { no: GUIDE_NO, en: GUIDE_EN }
