import type { CvDocument } from '@/lib/schema/cv'

export type PrivacyExportAccount = {
  id: string
  email: string | null
  provider: string | null
}

export type PrivacyExport = {
  exportedAt: string
  format: 'cvapp-privacy-export'
  formatVersion: 1
  account: PrivacyExportAccount | null
  documents: CvDocument[]
  localSettings: Record<string, string>
  /** Categories CVApp does not hold, stated so the export is complete. */
  notes: string[]
}

/**
 * The GDPR Art. 15 export: everything CVApp holds about one person.
 *
 * Distinct from `serialiseBundle`, which is the Art. 20 portability format -
 * CVs only, shaped so they can be imported back. This one adds the account
 * record and the stored preferences, and says out loud which categories are
 * empty. An export that silently omits a category is indistinguishable from
 * one that forgot it, which is the failure Art. 15 exists to prevent.
 */
export function buildPrivacyExport({
  account,
  documents,
  localSettings,
  now = new Date(),
}: {
  account: PrivacyExportAccount | null
  documents: CvDocument[]
  localSettings: Record<string, string>
  now?: Date
}): PrivacyExport {
  return {
    exportedAt: now.toISOString(),
    format: 'cvapp-privacy-export',
    formatVersion: 1,
    account,
    documents,
    localSettings,
    notes: [
      'CVApp keeps no usage data: no analytics, no tracking, no profiling.',
      'There is no stored version history. Undo lives in memory and is never saved.',
      'Photos are included inline in each document as data URIs; there are no separate uploaded files.',
      'Server logs held by the hosting provider may contain IP addresses. They contain no CV content.',
      'No consent records exist, because CVApp asks for no consent: storing and rendering your CV is contract performance under GDPR Art. 6(1)(b).',
    ],
  }
}

export function privacyExportFilename(now: Date = new Date()): string {
  return `CVApp_mine-data_${now.toISOString().slice(0, 10)}.json`
}
