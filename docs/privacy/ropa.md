# Record of processing activities (Art. 30)

The record every controller must keep and produce to Datatilsynet on request.
Art. 30(5) exempts organisations under 250 people only where the processing is
occasional, carries no risk, and involves no special categories — CVApp's is
regular and can involve special categories in free text, so the exemption does
not apply and this record is required.

Kept in the repository rather than a drawer, because it has to match the
application. `lib/privacy/__tests__/records.test.ts` fails if a processor
listed in the code is missing here.

**Last reviewed:** 2026-10-08, for Activity 4 — the assistant. Review whenever
a processing activity, a processor, or a retention rule changes.

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
| Recipients | Supabase, for signed-in users only. CV content reaches no CVApp server as part of this activity: there are no Server Actions, and the only route handler that reads a body is the assistant's — Activity 4, which the user triggers per press. `lib/privacy/__tests__/no-server-cv.test.ts` fails if a second one appears |
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
| Categories of data | Email address, a bcrypt password hash, sign-up and sign-in timestamps, confirmation state. Plus, for an account nearing deletion, a `retention_notices` row holding the user id and the date the warning went out |
| Recipients | Supabase (GoTrue). Resend, for the single warning email sent before an unused account is deleted — the address only, never anything else |
| Transfers outside the EEA | None. Same Frankfurt region |
| Retention | Until account deletion, **or 24 months with no sign-in**, after which a warning is emailed and the account is deleted 30 days later unless the person signs in. Enforced by `supabase/migrations/20260914000003_retention.sql`, run daily by `/api/retention`. `supabase/tests/delete_own_account.sql` proves the row and everything referencing it goes |
| Security | CVApp never sees a plaintext password — it goes straight to `signInWithPassword`. Minimum length enforced; rate limiting in `lib/security/rate-limit.ts` |

**Closed 2026-09-14.** There is now a retention rule: 24 months of inactivity,
an emailed warning, 30 days, deletion. Signing in at any point cancels it, and
the warning row is dropped.

The job runs on Vercel but holds no privileged database key. The three
functions it calls are `security definer` and check a shared secret
themselves, and the only one that returns rows returns a user id and an email
address. That is deliberate: a service-role key would let the server read every
CV, which is the thing the policy says never happens.

## Activity 3 — Serving the site

| | |
|---|---|
| Purpose | Delivering the application, and keeping it available and secure |
| Legal basis | Art. 6(1)(f), legitimate interests. Assessed in `docs/privacy/legitimate-interest.md` |
| Data subjects | Every visitor, signed in or not |
| Categories of data | IP address, user agent, request path, timestamp, response status |
| Recipients | Vercel |
| Transfers outside the EEA | None. Function execution pinned to `fra1` by `regions` in `vercel.json`, confirmed by `x-vercel-id` reading `arn1::fra1::…` |
| Retention | **One hour.** Vercel retains runtime logs for 1 hour on Hobby; Pro is 1 day, Pro with Observability Plus 30 days. Re-check on any plan change |
| Security | Managed by the host. No CV content is logged, because none reaches the server |

## Activity 4 — The assistant

Added 2026-10-08. This is the first and only activity in which text a user
typed leaves the browser for a third country, and it exists because the
alternative — an assistant that guesses instead of reading — is worse than no
assistant.

| | |
|---|---|
| Purpose | Answering a user's questions about CVs and applications, and suggesting wording for text they are writing |
| Legal basis | **Art. 6(1)(a), consent**, given per press. Not Art. 6(1)(b): the service works fully without it, so it is not necessary for the contract. Not Art. 6(1)(f): a transfer of free text to the United States is not something a user would expect without being asked |
| Special categories | Possible, in the same way as Activity 1: a user may ask for help with a sentence about their own health or union role. Basis: Art. 9(2)(a), the explicit consent given by pressing the button on that specific text. The button names what will be sent before it is sent |
| Data subjects | Users who choose to use the assistant. Third parties only if the user pastes them into the text themselves |
| Categories of data | The user's question; the single piece of text they asked for help with; and three measurements the browser made — page count, paper size, and the ids of the quality checks that fired. **Not** the document, **not** the photograph, **not** the account. Name, email address, phone number, place and link URLs are replaced client-side with `[navn]`, `[e-post]`, `[telefon]` and `[sted]` by `lib/ai/redact.ts` before the request is built |
| National identity numbers | Refused outright. `NATIONAL_ID` in `lib/quality/checks.ts` is checked in the browser and again in the route; a match sends nothing and tells the user to remove it from their CV |
| Recipients | **OpenAI**, as a processor, for the one request. Nobody else. The request is sent with `store: false` |
| Transfers outside the EEA | **Yes — the United States.** Basis: Art. 49(1)(a), the data subject's explicit consent to this specific transfer, with OpenAI's Standard Contractual Clauses underneath. Stated in the `transfers` and `ai` sections of the policy |
| Retention | None at CVApp: no conversation, no question and no answer is written to any store, and the chat lives in the browser tab. At OpenAI: the request is not stored, and the shared instruction prefix may sit in a prompt cache for up to 24 hours (`prompt_cache_retention: '24h'`). The budget counter keeps a daily-rotating hash of IP and user agent, and nothing else, for at most 30 days |
| Automated decision-making | None within Art. 22. The assistant produces text; a suggestion becomes a change only when the user presses it, and `docs/ai/guidelines.md` forbids it from grading the person or predicting an outcome |
| Security | The API key exists only in the Vercel environment and is read only by `app/api/ai/route.ts`; it never reaches the browser. Spending is bounded twice: a $5 monthly roof on the OpenAI project, and the per-visitor, per-chat and global daily counters in `lib/ai/budget.ts`, enforced in one statement by `public.ai_budget_take` |

### The visitor hash is not an identifier

The daily limits need to tell one visitor from another, and nothing more. The
counter row holds `sha256(date : job secret : IP : user agent)` truncated to 32
characters — it cannot be reversed into either input, it changes at midnight,
and rows older than 30 days are deleted by the function itself. No IP address
is stored.

## What is deliberately not processed

Listing these matters: a record that only says what is collected invites the
assumption that everything else is too.

- **No analytics beyond a page count and a load time.** Vercel Web Analytics
  records the page view, referrer, country, browser and device type, and
  Speed Insights records Web Vitals for the route - no cookie, no browser
  storage, no profile, and nothing from a CV. Everything else is
  still refused by `lib/privacy/__tests__/no-tracking.test.ts`, which also
  fails if the policy stops describing what is collected
- **No error tracker.** Same test
- **No marketing email.** No newsletter, no list
- **No profiling and no automated decision-making** within Art. 22. The
  assistant writes text; it does not score, rank or assess anybody
- **No CV ever sent whole to a language model.** `lib/ai/request.ts` has no
  field for a document, and `lib/privacy/__tests__/no-server-cv.test.ts` fails
  if one is added
- **No payment data.** No provider is integrated
- **No file storage.** A photograph is a data URI inside the document, not an
  uploaded object, and its EXIF is stripped by the Canvas re-encode in
  `lib/image/compress.ts`

## Retention periods, and what changes them

Both are plan-dependent, and CVApp is on the free tier of each. Recorded
2026-09-11 from the providers' own documentation.

| What | Now (free tier) | After the planned upgrade |
|---|---|---|
| Supabase backups | **None.** The Free plan takes no automatic backups at all | Pro: daily backups, 7-day retention. Team 14 days, Enterprise 30. PITR is a paid add-on that replaces daily backups |
| Vercel runtime logs | **1 hour** | Pro: 1 day. Pro with Observability Plus: 30 days |

**The Supabase number is the interesting one.** With no backups, an account
deletion is genuinely complete the moment it runs — there is no copy it fails
to reach. The policy said backups "rotate out on the provider's schedule",
which was a caution carried over from the legal review; on this plan it
described something that does not exist. Both languages now say what is
actually true, and say what will change if the plan does.

Buying Vercel Pro for the Art. 28 DPA does not touch this. Buying **Supabase**
Pro does: it introduces seven days during which a deleted row still exists in a
backup, and the policy has to say so on the same day the plan changes.

## Backup deletion reconciliation

On the current plan there is nothing to reconcile: Supabase Free takes no
backups, so no restore can resurrect a deleted account. This procedure exists
for the day that stops being true — a Supabase Pro upgrade introduces a
seven-day window in which deleted rows still exist somewhere.

The procedure, for when it can arise:

1. A restore from backup is an incident in itself — it happens only after data
   loss, and never as routine maintenance
2. After any restore, re-run the erasure proof
   (`supabase/tests/delete_own_account.sql`) and compare account rows against
   the deletion log kept under **Rights requests** in
   `docs/privacy/rights-requests.md`
3. Re-delete anything the restore brought back, and record it in that log

Until a restore actually happens there is nothing to reconcile, which is why
this is a procedure rather than a scheduled job.
