# Processors

Every vendor processing personal data on the operator's behalf, per GDPR
Art. 28. The machine-readable list is `lib/privacy/processors.ts`; the privacy
policy renders that list rather than repeating it, and a test fails if the app
contacts a host that is not on it.

## Data processing agreements

Neither vendor requires a separately signed agreement. Both incorporate their
DPA into the terms of service already accepted, which satisfies Art. 28's
requirement that the agreement be in writing.

That does not remove the record-keeping. A DPA incorporated by reference can
be amended by the vendor, so "we accepted their terms" is not by itself an
answer to *which* terms applied when. Save a PDF of each as it stands and note
the date retrieved.

| Vendor | DPA | Retrieved | Archived at |
|---|---|---|---|
| Supabase | supabase.com/legal/dpa | *to fill in* | *outside the repo* |
| Vercel | vercel.com/legal/dpa | *to fill in* | *outside the repo* |

Neither page offers a download. Open it and print to PDF; printing stamps the
retrieval date, which is the part that matters.

## Regions

| Vendor | Region | Status |
|---|---|---|
| Supabase | AWS `eu-central-1`, Frankfurt | Confirmed 2026-09-09. Inside the EEA. |
| Vercel | Unconfirmed | See below. |

**The Vercel region is deliberately recorded as `United States` in
`lib/privacy/processors.ts` until it is confirmed.** The free tier does not
allow choosing a function region and defaults to a US one, so the conservative
assumption is US processing. Narrowing a disclosed transfer later is safe;
widening one after the fact is not.

To confirm: Vercel → Project → Settings → Functions. If it is an EEA region,
update `processors.ts` and the policy's transfers section tightens by itself.

## Adding a processor

1. Check the vendor publishes a DPA, and archive it as above.
2. Prefer, in order: an EEA region, an EEA-based vendor, an adequacy-country
   vendor, then a US vendor with Data Privacy Framework certification plus
   Standard Contractual Clauses.
3. Add it to `lib/privacy/processors.ts`. The test will otherwise fail as soon
   as the app contacts it.
4. Bump `lastUpdated` in both `lib/legal/privacy-no.ts` and
   `lib/legal/privacy-en.ts`, and note the change in the app.
