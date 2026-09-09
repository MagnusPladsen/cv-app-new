# Before charging money

Everything that must be done before CVApp takes payment. Nothing here blocks
the free beta except where marked **now**.

Pick this up with: *"work through docs/privacy/before-charging-money.md"*.

## 1. Vercel Pro — $20/month

Decided: buy it when payment is switched on. It resolves three things at once.

- **Art. 28 data processing agreement.** Vercel's DPA applies to Enterprise and
  Pro plans only. On Hobby there is no processor agreement with the host.
  *(This one is a gap **now**, not only when charging: Art. 28 applies whenever
  a processor handles personal data, and Vercel handles IP addresses and
  session cookies on every request.)*
- **Standard Contractual Clauses.** They live inside that DPA, so without it
  the US transfer has no mechanism.
- **Commercial use.** Hobby is limited to non-commercial personal use; taking
  payment on it breaches Vercel's own terms.

After upgrading: set the function region to `fra1`, then change the Vercel row
in `lib/privacy/processors.ts` to `covered: true` with Germany as the country,
and simplify the policy's `transfers` section — the transfer disappears
entirely.

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
- **Terms of service** — a separate document from the privacy policy. Not
  written yet.
