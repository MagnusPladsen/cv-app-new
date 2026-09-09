# Launch checklist

The GDPR spec's blocking list, with the evidence for each. An unticked item
with no evidence is the honest state; a ticked item with no evidence is worse
than useless.

## Blocking before charging money or launching publicly

| Item | Status | Evidence |
|---|---|---|
| Data inventory written | done | `docs/privacy/data-inventory.md`, enforced by `lib/schema/__tests__/data-inventory.test.ts` |
| Privacy policy published and linked | done | `/[locale]/personvern`, linked site-wide from `components/chrome/AppFooter.tsx`; reachability tested in `e2e/legal.spec.ts` |
| DPAs accepted and archived | **operator action** | Both incorporate their DPA into accepted terms, so nothing needs signing. The PDFs still need retrieving and dating — see `docs/privacy/processors.md` |
| Hosting and database in an EU/EEA region | **partly** | Database: AWS `eu-central-1`, Frankfurt. Functions: `iad1`, Washington DC — a disclosed transfer, not an EEA region. See `docs/privacy/processors.md` |
| Account deletion that genuinely deletes, with a test | done | `supabase/tests/delete_own_account.sql`; run it and record the result |
| Data export (JSON) working | done | `lib/privacy/export.ts`, on the account page. Art. 15 (everything held) and Art. 20 (portable CVs) are separate buttons |
| Ownership checks on every CV/file endpoint, with tests | done | Row Level Security on `cv_documents`; verified live that an anonymous insert is refused with `42501` |
| No card data touching the servers | n/a | No payment provider integrated |
| PII scrubbing in the error tracker | n/a | There is no error tracker. `lib/privacy/__tests__/no-tracking.test.ts` fails if one is added |
| Cookieless analytics, or a compliant consent banner | done | No analytics at all, so no banner is required under *ekomloven § 3-15*. Test-enforced |
| Passwords hashed; rate limiting on auth | done | No passwords exist — OAuth only. Rate limiting in `lib/security/rate-limit.ts` |
| Signed, expiring URLs for uploaded files | n/a | No file storage. Photos are inline data URIs inside the document |
| EXIF stripping on image uploads | done | A side effect of the Canvas re-encode in `lib/image/compress.ts`, asserted in its test so an optimisation cannot undo it |

## Operator actions still outstanding

1. **Retrieve and date both DPAs.** `supabase.com/legal/dpa` and
   `vercel.com/legal/dpa` are web pages, not downloads: open each and print to
   PDF. Record the dates in `docs/privacy/processors.md`.
2. **Run the erasure proof** in the Supabase SQL editor and record the result.
3. **Set `CRON_SECRET`** in the Vercel production environment. Without it
   `/api/keep-alive` now returns 503 in production rather than running
   unauthenticated, so the daily cron will fail visibly until it is set.
4. **Have the privacy policy reviewed** by someone qualified in Norwegian
   privacy law before charging money. The spec puts this outside what a coding
   agent should settle.

## Known weaknesses, deliberately accepted

- **`script-src 'unsafe-inline'`** in the CSP. See `docs/privacy/README.md`.
- **Rate limiting is per-instance**, so it is a speed bump rather than a
  guarantee.
- **Function execution in the US.** Disclosed; removing it needs a paid
  Vercel plan.

## Deferred to the post-launch tier

ROPA (Art. 30), retention jobs for inactive accounts, restriction (Art. 18)
and objection (Art. 21) mechanisms, the breach response runbook, DPIA
screening, the legitimate-interest assessment, and backup deletion
reconciliation. These are the spec's own second tier; several depend on
decisions better made once the service is live.
