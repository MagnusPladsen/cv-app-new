import { PRIVACY_EN } from './privacy-en'
import { PRIVACY_NO } from './privacy-no'
import type { LegalDocument } from './types'

export type { LegalDocument, LegalSection } from './types'

export const PRIVACY_POLICY: Record<'no' | 'en', LegalDocument> = {
  no: PRIVACY_NO,
  en: PRIVACY_EN,
}
