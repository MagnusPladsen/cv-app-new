# Privacy documentation

These files are maintained alongside the code, not written once and
forgotten. Where a document can drift from the application, a test fails when
it does:

| Document | Kept honest by |
|---|---|
| `data-inventory.md` | `lib/schema/__tests__/data-inventory.test.ts` — every field in the CV schema must appear in the inventory table |
| `processors.md` | `lib/privacy/__tests__/processors.test.ts` — every external host the app talks to must be listed |

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

- **Content-Security-Policy `script-src`.** The policy falls back to
  `default-src 'self'` rather than using a nonce. A nonce would opt every page
  into dynamic rendering, costing the static optimisation the landing page and
  gallery currently get. Revisit if an inline script is ever needed.
- **Vercel deployment region** is unconfirmed. The privacy policy cannot claim
  that no data leaves the EEA until it is.
