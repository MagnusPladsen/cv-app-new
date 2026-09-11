# Record of processing activities (Art. 30)

The record every controller must keep and produce to Datatilsynet on request.
Art. 30(5) exempts organisations under 250 people only where the processing is
occasional, carries no risk, and involves no special categories — CVApp's is
regular and can involve special categories in free text, so the exemption does
not apply and this record is required.

Kept in the repository rather than a drawer, because it has to match the
application. `lib/privacy/__tests__/records.test.ts` fails if a processor
listed in the code is missing here.

**Last reviewed:** 2026-09-11. Review whenever a processing activity, a
processor, or a retention rule changes.

## Controller

| | |
|---|---|
| Name | Magnus Pladsen |
| Status | Private individual. No organisation number: no ENK is registered yet |
| Address | To be added with the organisation number, before charging money |
| Contact for privacy matters | `magnus_pladsen@hotmail.com` — to be replaced by `personvern@` on an owned domain |
| Data protection officer | None. Art. 37 does not require one: CVApp is not a public authority, its core activity is not large-scale monitoring, and it does not process special categories on a large scale |
| Representative (Art. 27) | Not applicable — the controller is established in the EEA |

## Activity 1 — Building and storing a CV

| | |
|---|---|
| Purpose | Letting a person write, format and download their own CV |
| Legal basis | Art. 6(1)(b), performance of a contract the data subject is party to. The service *is* storing and rendering what they type |
| Special categories | Possible in free text — trade-union membership, health, religion, political opinion. Basis: Art. 9(2)(a), explicit consent, given by typing it into a field whose purpose is to appear on the CV. Withdrawable by editing or deleting the CV. See the `free-text` section of the policy |
| Data subjects | Users of CVApp. Also **third parties named by the user** — referees, and colleagues named in an entry |
| Categories of data | Name, contact details, photograph, employment history, education, skills, languages, certifications, interests, driving licences, references, and anything typed into a free-text field |
| Recipients | Supabase, for signed-in users only. No one else. CV content never reaches a CVApp server: there are no Server Actions, no route handler reads a body, and `lib/privacy/__tests__/no-server-cv.test.ts` fails if that changes |
| Transfers outside the EEA | None. AWS `eu-central-1`, Frankfurt |
| Retention | Browser: until the user deletes the CV, clears browser data, or signs out. Account: until the user deletes the CV or the account. A deleted CV leaves a tombstone row carrying id, timestamps and `user_id`, so other devices learn of the deletion; that row is deleted with the account |
| Security | Row Level Security keyed on `auth.uid()`; TLS in transit; encryption at rest by the provider; no CV content in logs |

### Art. 14 and the people a user names

A referee's details are supplied by the user, not by the referee. Art. 14 would
normally require informing that person. CVApp has no way to contact them and no
lawful route to try — using the referee's email to send them a privacy notice
would itself be processing for a new purpose.

Position taken: the user is told, in the `references` section of the policy,
that they are responsible for having the person's agreement before entering
their details. This is the common position for address-book-shaped products and
is the one the spec flags as needing legal confirmation. **Not settled by this
document.**

## Activity 2 — Accounts and authentication

| | |
|---|---|
| Purpose | Letting a user sign in so their CVs follow them between devices |
| Legal basis | Art. 6(1)(b). Sync is the service being asked for |
| Data subjects | Registered users |
| Categories of data | Email address, a bcrypt password hash, sign-up and sign-in timestamps, confirmation state |
| Recipients | Supabase (GoTrue) |
| Transfers outside the EEA | None. Same Frankfurt region |
| Retention | Until account deletion. `supabase/tests/delete_own_account.sql` proves the row and everything referencing it goes |
| Security | CVApp never sees a plaintext password — it goes straight to `signInWithPassword`. Minimum length enforced; rate limiting in `lib/security/rate-limit.ts` |

**Known gap:** no retention rule for inactive accounts. Art. 5(1)(e) expects
one. It needs warn-then-delete email, which CVApp cannot send yet, so it is
acknowledged rather than promised. See `docs/privacy/launch-checklist.md`.

## Activity 3 — Serving the site

| | |
|---|---|
| Purpose | Delivering the application, and keeping it available and secure |
| Legal basis | Art. 6(1)(f), legitimate interests. Assessed in `docs/privacy/legitimate-interest.md` |
| Data subjects | Every visitor, signed in or not |
| Categories of data | IP address, user agent, request path, timestamp, response status |
| Recipients | Vercel |
| Transfers outside the EEA | None. Function execution pinned to `fra1` by `regions` in `vercel.json`, confirmed by `x-vercel-id` reading `arn1::fra1::…` |
| Retention | Per Vercel's own schedule. **The actual number is not yet recorded** — see the note below |
| Security | Managed by the host. No CV content is logged, because none reaches the server |

## What is deliberately not processed

Listing these matters: a record that only says what is collected invites the
assumption that everything else is too.

- **No analytics, of any kind.** No page views, no events, no fingerprinting.
  `lib/privacy/__tests__/no-tracking.test.ts` fails if a tracker is added
- **No error tracker.** Same test
- **No marketing email.** No newsletter, no list
- **No profiling and no automated decision-making** within Art. 22
- **No payment data.** No provider is integrated
- **No file storage.** A photograph is a data URI inside the document, not an
  uploaded object, and its EXIF is stripped by the Canvas re-encode in
  `lib/image/compress.ts`

## Retention periods still to be filled in

Two rows above say "per the provider's schedule". Art. 13(2)(a) permits stating
the *criteria* rather than a period, so this is lawful — but a real number is
better, and both are published facts:

1. **Supabase backups.** Backup frequency and retention are per-plan and stated
   in the Supabase docs under Platform → Backups. Record the number for the
   plan CVApp is actually on, not the highest tier
2. **Vercel logs.** Runtime-log retention is per-plan and stated in Vercel's
   docs under Observability → Logs. Hobby retains far less than Pro, so this
   changes when the plan changes

Put the numbers in this table and in the policy's `retention` section together
— the policy is the document people read.

## Backup deletion reconciliation

Deletion is immediate in the live database, and backups rotate on the
provider's schedule. The reconciliation obligation is to make sure a restore
never resurrects deleted data.

The procedure, for the only case where it can arise:

1. A restore from backup is an incident in itself — it happens only after data
   loss, and never as routine maintenance
2. After any restore, re-run the erasure proof
   (`supabase/tests/delete_own_account.sql`) and compare account rows against
   the deletion log kept under **Rights requests** in
   `docs/privacy/rights-requests.md`
3. Re-delete anything the restore brought back, and record it in that log

Until a restore actually happens there is nothing to reconcile, which is why
this is a procedure rather than a scheduled job.
