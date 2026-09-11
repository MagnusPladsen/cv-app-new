# Privacy documentation

These files are maintained alongside the code, not written once and
forgotten. Where a document can drift from the application, a test fails when
it does:

| Document | Kept honest by |
|---|---|
| `data-inventory.md` | `lib/schema/__tests__/data-inventory.test.ts` — every field in the CV schema must appear in the inventory table |
| `processors.md` | `lib/privacy/__tests__/processors.test.ts` — every external host the app talks to must be listed |
| `ropa.md` | `lib/privacy/__tests__/records.test.ts` — every processor in the code must appear, and every activity must name a legal basis |
| `dpia-screening.md`, `legitimate-interest.md`, `breach-runbook.md`, `rights-requests.md` | the same test — a screening must reach a conclusion, an Art. 6(1)(f) claim must have a balancing test behind it, the runbook must carry the 72-hour deadline, and the procedure must cover every right |

`before-charging-money.md` is the list to work through before CVApp takes
payment. `launch-checklist.md` is the state of the spec's blocking list.

## When something happens

| Situation | Read |
|---|---|
| Someone asks for their data, or asks you to delete or correct it | `rights-requests.md` |
| Data has leaked, been lost, or been shown to the wrong person | `breach-runbook.md` — the 72-hour clock starts when you become aware |
| Datatilsynet asks what you process | `ropa.md`, then `data-inventory.md` |
| A feature is about to infer, score, share or match something | `dpia-screening.md` — its re-screen triggers are the point |

## What these are not

They describe what the application actually does, accurately and in detail.
They are not legal advice, and the privacy policy in particular must be
reviewed by someone qualified in Norwegian privacy law before CVApp charges
money. The spec is explicit about what is out of scope for a coding agent:
the final wording of the policy and terms, the DPIA conclusion, and the
Art. 14 position on referee data.

Supervisory authority: Datatilsynet. Primary sources: datatilsynet.no,
lovdata.no.

## Open items

- **Content-Security-Policy `script-src` allows `'unsafe-inline'`.** This is
  the weakest part of the policy and is deliberate, not an oversight. Next's
  framework bootstrap is an inline script, so `'self'` alone blocks hydration:
  the page renders and then does nothing. The strict fix is a per-request
  nonce, which has to be threaded through a proxy that also runs next-intl
  and refreshes the Supabase session — a half-wired nonce there signs people
  out at random, so it needs its own change with its own tests rather than
  being bolted on.

  What still holds meanwhile: `connect-src` limits where an injected script
  could send anything, and `object-src`, `base-uri`, `form-action`,
  `frame-ancestors` and `img-src` are unaffected.
- ~~**Vercel functions execute in `iad1` (Washington DC).**~~ Resolved
  2026-09-09: `regions: ["fra1"]` in `vercel.json` moved execution to
  Frankfurt, which the Hobby plan honoured despite the dashboard's region
  picker being greyed out. No Chapter V transfer remains. Re-check after any
  plan change.
- **No retention rule for inactive accounts.** The one genuine Art. 5(1)(e)
  gap. A warn-then-delete job needs email sending, which CVApp has no
  capability for, so it is acknowledged in `ropa.md` rather than promised in
  the policy — a stated rule that nothing enforces is worse than a declared
  gap.
- **Two retention periods are stated as "the provider's schedule"** rather
  than a number. Lawful under Art. 13(2)(a), which permits criteria, but weak.
  `ropa.md` says where to look both up.
