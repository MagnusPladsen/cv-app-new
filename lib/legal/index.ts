import { PRIVACY_EN } from './privacy-en'
import { PRIVACY_NO } from './privacy-no'
import { TERMS_EN } from './terms-en'
import { TERMS_NO } from './terms-no'
import type { LegalDocument } from './types'

export type { LegalDocument, LegalSection } from './types'

export const PRIVACY_POLICY: Record<'no' | 'en', LegalDocument> = {
  no: PRIVACY_NO,
  en: PRIVACY_EN,
}

export const TERMS: Record<'no' | 'en', LegalDocument> = {
  no: TERMS_NO,
  en: TERMS_EN,
}
