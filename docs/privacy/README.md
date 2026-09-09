# Privacy documentation

These files are maintained alongside the code, not written once and
forgotten. Where a document can drift from the application, a test fails when
it does:

| Document | Kept honest by |
|---|---|
| `data-inventory.md` | `lib/schema/__tests__/data-inventory.test.ts` — every field in the CV schema must appear in the inventory table |
| `processors.md` | `lib/privacy/__tests__/processors.test.ts` — every external host the app talks to must be listed |

`before-charging-money.md` is the list to work through before CVApp takes
payment. `launch-checklist.md` is the state of the spec's blocking list.

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
- **Vercel functions execute in `iad1` (Washington DC)**, confirmed
  2026-09-09. CV content stays in Frankfurt; request metadata does not. The
  policy discloses this. Moving to `fra1` needs a paid plan and would remove
  the transfer.
