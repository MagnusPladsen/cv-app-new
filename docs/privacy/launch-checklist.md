# Launch checklist

The GDPR spec's blocking list, with the evidence for each. An unticked item
with no evidence is the honest state; a ticked item with no evidence is worse
than useless.

## Blocking before charging money or launching publicly

| Item | Status | Evidence |
|---|---|---|
| Data inventory written | done | `docs/privacy/data-inventory.md`, enforced by `lib/schema/__tests__/data-inventory.test.ts` |
| Privacy policy published and linked | done | `/[locale]/personvern`, linked site-wide from `components/chrome/AppFooter.tsx`; reachability tested in `e2e/legal.spec.ts` |
| Terms of use, as a separate document | done | `/[locale]/vilkar`. A test asserts the terms do not restate the policy - the spec requires two documents, not one with a privacy section |
| DPAs accepted and archived | **BLOCKED** | Supabase: covered. Vercel: **its DPA applies to Enterprise and Pro plans only**, and CVApp is on Hobby, so there is no Art. 28 agreement with the host. Now the only remaining transfer-related gap, since the functions moved to Frankfurt. See `docs/privacy/processors.md` |
| Hosting and database in an EU/EEA region | done | Database: AWS `eu-central-1`, Frankfurt. Functions: `fra1`, Frankfurt, after setting `regions` in `vercel.json`. No personal data leaves the EEA |
| Account deletion that genuinely deletes, with a test | done | `supabase/tests/delete_own_account.sql`; run it and record the result |
| Data export (JSON) working | done | `lib/privacy/export.ts`, on the account page. Art. 15 (everything held) and Art. 20 (portable CVs) are separate buttons |
| Ownership checks on every CV/file endpoint, with tests | done | Row Level Security on `cv_documents`; verified live that an anonymous insert is refused with `42501` |
| No card data touching the servers | n/a | No payment provider integrated |
| PII scrubbing in the error tracker | n/a | There is no error tracker. `lib/privacy/__tests__/no-tracking.test.ts` fails if one is added |
| Cookieless analytics, or a compliant consent banner | done | No analytics at all, so no banner is required under *ekomloven § 3-15*. Test-enforced |
| Passwords hashed; rate limiting on auth | done | Sign-in is email and password. Supabase GoTrue stores a bcrypt hash and CVApp never sees the plaintext — it goes straight to `signInWithPassword`. Minimum length enforced in `lib/auth/errors.ts`; rate limiting in `lib/security/rate-limit.ts` |
| Signed, expiring URLs for uploaded files | n/a | No file storage. Photos are inline data URIs inside the document |
| EXIF stripping on image uploads | done | A side effect of the Canvas re-encode in `lib/image/compress.ts`, asserted in its test so an optimisation cannot undo it |

## From the legal review, 2026-09-10

A Norwegian privacy review of the published policy. Its verdict on the policy
itself was positive; these are the corrections it raised.

### Fixed in code

| Finding | What changed |
|---|---|
| No Art. 9 basis for special categories — contract does not cover them | The policy now states that special-category data typed into a free-text field is stored on the explicit consent given by entering it (Art. 9(2)(a)), withdrawable by editing or deleting the CV |
| "We hold nothing about you" contradicts the server-log section | Reworded: no CV content is stored, but the host holds IP addresses in server logs |
| "Immediately and permanently" overstates deletion, given backups | Reworded: immediate from the live systems, backups rotate on the provider's schedule, deleted data is never restored into production |
| Tombstone rows described as holding "only id and timestamps" | They also carry `user_id`. The policy now says so, and says the row is personal data deleted with the account — which `supabase/tests/delete_own_account.sql` proves |
| Art. 13(1)(f) requires saying how to obtain the SCCs | Moot: no data leaves the EEA any more, so the policy relies on no transfer mechanism and the `transfers` section says exactly that |
| The claim that CV content is not processed in the US needed verifying | Verified and now test-enforced by `lib/privacy/__tests__/no-server-cv.test.ts`: no Server Actions, no server module imports the CV store, no route handler parses a body, and the only server-rendered CV is the fictional demo document. Sync goes browser → Frankfurt directly |
| The "nothing is sent to any third party" claim was absolute | Scoped to CV content, which is what CVApp controls |

### Still outstanding, and why

| Finding | Status |
|---|---|
| **Vercel Hobby** — no Art. 28 DPA, and Hobby forbids commercial use, so taking payment breaches both GDPR and Vercel's terms | Operator decision, taken: buy Pro when payment is switched on. The region half of this resolved itself for free — see `docs/privacy/before-charging-money.md` |
| Move functions to an EEA region | **Done.** Hobby honoured `regions: ["fra1"]` in `vercel.json`, despite the dashboard's region picker being greyed out. Confirmed by `x-vercel-id` reading `arn1::fra1::...` |
| Vercel's AI-partner data setting | Operator action: Vercel team settings. Service-generated data, not CV content, but the policy makes a firm claim and the setting should match it |
| No retention rule for inactive accounts (Art. 5(1)(e)) | **Genuinely not implemented.** A warn-then-delete job needs email sending, which CVApp has no capability for. Deliberately not promised in the policy, because a stated rule that no job enforces is worse than an acknowledged gap. Plan 6 |
| Server-log and backup retention periods stated as "the provider's schedule" | **Done 2026-09-11.** Vercel Hobby retains runtime logs for 1 hour; Supabase Free takes no backups at all. Both numbers are in the policy and in `ropa.md`, with what changes on upgrade. A test fails if the policy stops naming them |
| Contact address is a personal hotmail account | Operator action. Access and deletion requests carry a one-month statutory deadline and should not land in a personal inbox. `personvern@` on a domain you own |
| Organisation number and address once an ENK is registered | Required by ehandelsloven and angrerettloven once you charge. Update the `controller` section at the same time |
| Payment not yet covered | When Stripe is added: it is an independent controller for card data, not a processor; invoices carry a five-year retention under bokføringsloven. Must ship with the payment feature, not after |

## Operator actions still outstanding

1. **Resolve the Vercel DPA gap.** This is the one blocker. Vercel Pro makes
   the DPA apply *and* allows moving function execution to `fra1`, which
   removes the US transfer as well. See `docs/privacy/processors.md`.
2. ~~**Set `CRON_SECRET`.**~~ Done 2026-09-09; the endpoint returns 401 to
   unauthenticated callers.
3. **Have the privacy policy reviewed** by someone qualified in Norwegian
   privacy law before charging money. The spec puts this outside what a coding
   agent should settle.

Done: both DPAs archived in `legal/`; the erasure proof run against the live
database (2026-09-09, no exception raised).

## Known weaknesses, deliberately accepted

- **`script-src 'unsafe-inline'`** in the CSP. See `docs/privacy/README.md`.
- **Rate limiting is per-instance**, so it is a speed bump rather than a
  guarantee.
- ~~**Function execution in the US.**~~ Resolved: `regions` in `vercel.json`
  moved the functions to Frankfurt on the free plan.

## Deferred to the post-launch tier

ROPA (Art. 30), retention jobs for inactive accounts, restriction (Art. 18)
and objection (Art. 21) mechanisms, the breach response runbook, DPIA
screening, the legitimate-interest assessment, and backup deletion
reconciliation. These are the spec's own second tier; several depend on
decisions better made once the service is live.
