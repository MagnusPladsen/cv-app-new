# Before charging money

Everything that must be done before CVApp takes payment.

Pick this up with: *"work through docs/privacy/before-charging-money.md"*.

---

## Read this first: one item is a gap today

Most of this list only bites when money changes hands. **One does not.**

| | Gap today | Only at payment |
|---|---|---|
| **Vercel has no Art. 28 DPA with us** | **yes** | — |
| ~~No SCCs for the US transfer~~ | resolved 2026-09-09 — functions moved to `fra1`, so no transfer remains | — |
| Hobby forbids commercial use | — | yes |
| No org.nr in the policy | — | yes |
| Invoice retention, Stripe as recipient | — | yes |
| Contact address on a personal inbox | weak, not unlawful | — |
| No inactive-account deletion | **yes** (Art. 5(1)(e)) | — |

**Why the DPA is a gap now:** Art. 28 applies whenever a processor handles
personal data on the controller's behalf. Vercel handles IP addresses and
session cookies on every request, whether or not anyone is paying. The
commercial-use restriction is the part that waits for payment; the processor
agreement is not.

**The decision on record (2026-09-09):** buy Vercel Pro when payment is
switched on. That is a deliberate, informed acceptance of the gap during the
free beta, not an oversight — small user numbers, no revenue, and the fix is
one purchase away. It is written down here so that nobody later concludes the
gap began at launch.

**If the beta grows,** revisit sooner: the argument for accepting it is
proportionality, and proportionality changes with the number of people whose
IP addresses are involved.

---

## 1. Vercel Pro — $20/month

Decided: buy it when payment is switched on. It resolves three things at once.

- **Art. 28 data processing agreement.** Vercel's DPA applies to Enterprise and
  Pro plans only. On Hobby there is no processor agreement with the host. See
  the callout above: this one is already a gap.
- ~~**Standard Contractual Clauses.**~~ No longer relevant: the functions run
  in Frankfurt, so there is no transfer needing a mechanism.
- **Commercial use.** Hobby is limited to non-commercial personal use; taking
  payment on it breaches Vercel's own terms.

The region is already sorted: `regions: ["fra1"]` in `vercel.json` works on
Hobby, even though the dashboard's picker is greyed out. After upgrading, the
only change is the Vercel row in `lib/privacy/processors.ts` — set
`covered: true` and reword the note.

## 2. Privacy contact on a domain you own

- Replace `magnus_pladsen@hotmail.com` with something like `personvern@`.
- Access and deletion requests carry a **one-month statutory deadline** and
  should not land in a personal inbox.
- Update the `controller` section in `lib/legal/privacy-no.ts` and
  `privacy-en.ts`.

## 3. Organisation number and address

Once the ENK is registered:

- Add org.nr and business address to the `controller` section.
- Required by *ehandelsloven* and *angrerettloven* once you charge.
- The policy currently says there is no company and therefore no org.nr, which
  is true today and must change the day it is not.

## 4. Retention periods, with actual numbers

The policy currently says "the provider's schedule" for two things. Lawful
under Art. 13, which permits criteria rather than periods, but weak.

- Supabase backup retention on your plan.
- Vercel server-log retention on your plan.
- Put both numbers into the `retention` section of the policy.

## 5. Inactive-account deletion

Storage limitation, Art. 5(1)(e). **Not implemented, and deliberately not
promised in the policy** — a stated rule that no job enforces is worse than an
acknowledged gap.

Needs, in order:

- An email capability. CVApp has none today; feedback opens the user's own mail
  client rather than sending anything.
- A warn-then-delete job: flag at 24 months without sign-in, email a warning,
  delete at 36. `auth.users.last_sign_in_at` is the field.
- A `retention` paragraph in the policy, added in the same change.

Part of Plan 6.

## 6. Payment brings its own policy changes

These must ship **with** the payment feature, not after it:

- **Stripe as a recipient** — an independent controller for card data, not a
  processor. Add it to `lib/privacy/processors.ts` with that distinction stated.
- **Invoice data** — five-year retention under *bokføringsloven*, which
  outlives account deletion. The `retention` section must say so, and the
  deletion flow must keep the minimum: name, amount, date, invoice number.
- **Legal basis** — Art. 6(1)(c), legal obligation, for the accounting records.
- **No card data on our servers.** Use Stripe's hosted checkout or Elements so
  card numbers never reach the application.

## 7. Legal review

- Have the privacy policy and terms reviewed by someone qualified in Norwegian
  privacy law.
- The policy accurately describes what the app does. That is not the same as
  being legally sufficient, and the spec puts the final wording outside what a
  coding agent should settle.

## Also worth doing, not blocking

- **Vercel AI-partner data sharing** — off, in Team Settings. It covers
  service-generated data rather than CV content, but the policy makes a firm
  claim and the setting should match it.
- **Terms of service** — written, at `/[locale]/vilkar`. Review it alongside
  the privacy policy: it promises little rather than disclaiming much, because
  Norwegian consumer law limits what can be disclaimed, but the wording is
  still a lawyer's call.
