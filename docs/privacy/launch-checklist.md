# Launch checklist

The GDPR spec's blocking list, with the evidence for each. An unticked item
with no evidence is the honest state; a ticked item with no evidence is worse
than useless.

## Blocking before charging money or launching publicly

| Item | Status | Evidence |
|---|---|---|
| Data inventory written | done | `docs/privacy/data-inventory.md`, enforced by `lib/schema/__tests__/data-inventory.test.ts` |
| Privacy policy published and linked | done | `/[locale]/personvern`, linked site-wide from `components/chrome/AppFooter.tsx`; reachability tested in `e2e/legal.spec.ts` |
| DPAs accepted and archived | **BLOCKED** | Supabase: covered. Vercel: **its DPA applies to Enterprise and Pro plans only**, and CVApp is on Hobby — so there is no Art. 28 agreement with the host and no SCCs for the US transfer. See `docs/privacy/processors.md` |
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

1. **Resolve the Vercel DPA gap.** This is the one blocker. Vercel Pro makes
   the DPA apply *and* allows moving function execution to `fra1`, which
   removes the US transfer as well. See `docs/privacy/processors.md`.
2. **Set `CRON_SECRET`** in the Vercel production environment. Without it
   `/api/keep-alive` returns 503 in production rather than running
   unauthenticated, so the daily cron fails visibly until it is set — and a
   paused Supabase project makes every sign-in fail.
3. **Have the privacy policy reviewed** by someone qualified in Norwegian
   privacy law before charging money. The spec puts this outside what a coding
   agent should settle.

Done: both DPAs archived in `legal/`; the erasure proof run against the live
database (2026-09-09, no exception raised).

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
