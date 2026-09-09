export type Processor = {
  name: string
  purpose: string
  /** Where the processing happens. Confirm in each vendor's dashboard. */
  country: string
  /** Hostnames the application contacts, for the drift test. */
  hosts: string[]
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
    purpose: 'Authentication, and storage of CVs for signed-in users',
    country: 'Germany (AWS eu-central-1, Frankfurt)',
    hosts: ['supabase.co', 'supabase.com'],
  },
  {
    name: 'Vercel',
    purpose: 'Application hosting and delivery; server logs containing IP addresses',
    // Conservative until the deployment region is confirmed: Vercel is a US
    // company and its free tier does not allow choosing a function region, so
    // the policy must assume US processing rather than claim EEA. Tighten
    // this to the actual region once it is read off the dashboard - narrowing
    // a disclosed transfer is safe, widening one after the fact is not.
    country: 'United States',
    hosts: ['vercel.app', 'vercel.com', 'pladsen.dev'],
  },
] as const
