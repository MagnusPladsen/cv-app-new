export type Localised = { no: string; en: string }

export type Processor = {
  name: string
  /** Localised: this is rendered in the privacy policy, in the reader's language. */
  purpose: Localised
  /** Where the processing happens. Confirm in each vendor's dashboard. */
  country: Localised
  /** Hostnames the application contacts, for the drift test. */
  hosts: string[]
  /**
   * Whether an Art. 28 data processing agreement actually covers this
   * processor today - not whether the vendor publishes one. Several publish a
   * DPA that applies only to paid plans.
   */
  dpa: { covered: boolean; note: Localised }
}

/**
 * Every processor handling personal data on the operator's behalf, per
 * GDPR Art. 28. Rendered in the privacy policy, and enforced by a test that
 * fails when the app talks to a host that is not listed here.
 *
 * Adding an entry is not the whole job: the vendor's DPA has to apply and be
 * archived first. See docs/privacy/processors.md.
 */
export const PROCESSORS: readonly Processor[] = [
  {
    name: 'Supabase',
    purpose: {
      no: 'Innlogging, og lagring av CV-er for innloggede brukere',
      en: 'Authentication, and storage of CVs for signed-in users',
    },
    country: {
      no: 'Tyskland (AWS eu-central-1, Frankfurt)',
      en: 'Germany (AWS eu-central-1, Frankfurt)',
    },
    hosts: ['supabase.co', 'supabase.com'],
    dpa: {
      covered: true,
      note: {
        no: 'Ja — gjelder automatisk gjennom vilkårene.',
        en: 'Yes — applies automatically through the terms.',
      },
    },
  },
  {
    name: 'Vercel',
    purpose: {
      no: 'Drift og levering av nettstedet; tjenerlogger med IP-adresser',
      en: 'Application hosting and delivery; server logs containing IP addresses',
    },
    // Confirmed 2026-09-09: x-vercel-id on a dynamic route reads
    // `arn1::iad1::...` - entered at the Stockholm edge, executed in
    // Washington DC. So this is a real Chapter V transfer, disclosed in the
    // policy's transfers section and covered by Vercel's DPF certification
    // and SCCs. Region selection is a paid feature; revisit on any plan
    // change. See docs/privacy/processors.md.
    country: { no: 'USA (iad1, Washington DC)', en: 'United States (iad1, Washington DC)' },
    hosts: ['vercel.app', 'vercel.com', 'pladsen.dev'],
    // Read the document rather than assuming it applies. Vercel's DPA says:
    // "This Addendum applies to Vercel's Processing of Personal Data as a
    // Processor under the Agreement for Customers who are on Enterprise and
    // Pro plans." CVApp is on Hobby, so it does not apply - and the Standard
    // Contractual Clauses that would cover the US transfer live inside it.
    // This is a launch blocker, not a disclosure question.
    // See docs/privacy/processors.md.
    dpa: {
      covered: false,
      note: {
        no: 'Nei — gjelder ikke på gjeldende abonnement. Under avklaring.',
        en: 'No — does not apply on the current plan. Being resolved.',
      },
    },
  },
] as const
