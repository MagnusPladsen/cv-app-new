# Personal data breach runbook

Read this when something has already gone wrong. The clock in Art. 33 starts
when you become **aware** of a breach, not when you finish investigating, and
it runs for **72 hours** including weekends.

A breach is not only an attacker. Art. 4(12) covers accidental or unlawful
destruction, loss, alteration, unauthorised disclosure of, or access to
personal data. Deleting the wrong rows is a breach. A bug that shows one user
another user's CV is a breach.

## Hour zero

1. **Write down the time you became aware.** Everything else is measured from
   it. Put it at the top of the entry in the log below
2. **Stop the bleeding.** Revoke the key, take the route down, roll back the
   deploy. Availability is worth less than containment
3. **Do not delete evidence.** Not the logs, not the bad deploy, not the
   branch. Rolling forward over the top of a breach makes the assessment
   impossible

## Assess, and be specific

You need these to decide anything, and you will need them again for the form:

- **What kind of breach:** confidentiality (disclosed), integrity (altered),
  availability (lost or unreachable)
- **What data:** name the categories. "CV content" is not precise enough — CVs
  can contain special-category data in free text, and that changes the risk
- **How many people**, at least as an order of magnitude
- **How long it was open**, from deploy or key leak to containment
- **Was it actually accessed**, or only accessible? Check the logs before
  assuming either
- **Is the data usable by whoever got it?** A bcrypt hash is not a password.
  An encrypted backup with no key is a different risk from a plaintext dump

## Decide: notify Datatilsynet?

**Notify unless the breach is unlikely to result in a risk** to people's
rights and freedoms (Art. 33(1)). The presumption is notification; "unlikely"
is the exception you have to justify.

Notify through **datatilsynet.no**, which carries the current form. If you do
not have everything within 72 hours, **notify anyway** and say what is still
unknown — Art. 33(4) explicitly allows information in phases. A late complete
notification is worse than a prompt incomplete one.

If you decide not to notify, **write down why**, in the log below. Art. 33(5)
requires the record regardless of the decision, and an undocumented decision
reads as no decision.

## Decide separately: tell the users?

A higher bar: **high risk** to the individuals (Art. 34). If CV content or
account credentials were exposed, assume high risk and tell them.

Tell them directly, in plain language, in Norwegian and English. Art. 34(2)
requires: what happened, the likely consequences, what you are doing about it,
and a contact point. No euphemisms — "a security incident may have affected
some data" tells nobody anything they can act on.

You are excused from telling them (Art. 34(3)) if the data was unintelligible
to whoever got it — properly encrypted, say — or if you have since made the
high risk unlikely. Public notice is an acceptable substitute only when
contacting everyone involves disproportionate effort, which for a service that
holds every user's email will rarely be true.

## Afterwards

- Fix the cause, not the symptom
- Add the test that would have caught it. This repository's convention is that
  a claim without a test is a claim that drifts
- Keep the log entry. Datatilsynet can ask for it

## Where things are, when you are in a hurry

| | |
|---|---|
| Database, auth, backups | Supabase project `peeuqlfigkphfbolxwqh`, AWS `eu-central-1` |
| Hosting, server logs | Vercel, functions in `fra1` |
| What data exists where | `docs/privacy/data-inventory.md` |
| Who processes what | `docs/privacy/processors.md`, `lib/privacy/processors.ts` |
| Proof of what deletion does | `supabase/tests/delete_own_account.sql` |
| Supervisory authority | Datatilsynet, datatilsynet.no |

## Log (Art. 33(5))

Every breach goes here, including the ones not notified. The record is the
obligation; the notification is a consequence of it.

| Aware at | What happened | Data and people affected | Notified Datatilsynet? | Users told? | Reasoning |
|---|---|---|---|---|---|
| _none yet_ | | | | | |
