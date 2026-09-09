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
| Vercel | `iad1`, Washington DC, USA | Confirmed 2026-09-09. **Outside the EEA.** |

### How the Vercel region was confirmed

```
curl -sI https://cv.pladsen.dev/api/keep-alive | grep x-vercel-id
x-vercel-id: arn1::iad1::b8d2t-...
```

Two segments: the request entered the edge network at `arn1` (Stockholm) and
the serverless function executed at `iad1` (Washington DC). It is the second
that matters — the edge segment only reflects where the visitor is.

**What this means.** CV content and account records stay in Frankfurt. But
every request's IP address and sign-in cookies are processed in the United
States, which is a Chapter V transfer. It is lawful under Vercel's Data
Privacy Framework certification and the Standard Contractual Clauses in its
DPA, and the privacy policy discloses it in the `transfers` section.

Region selection is a paid feature; the free tier cannot change this. Moving
function execution to `fra1` would remove the transfer entirely and is worth
doing if the project ever moves to a paid plan — but it is a disclosure
question today, not a blocker.

Re-check after any plan change, and after any change to where the project
deploys.

## Adding a processor

1. Check the vendor publishes a DPA, and archive it as above.
2. Prefer, in order: an EEA region, an EEA-based vendor, an adequacy-country
   vendor, then a US vendor with Data Privacy Framework certification plus
   Standard Contractual Clauses.
3. Add it to `lib/privacy/processors.ts`. The test will otherwise fail as soon
   as the app contacts it.
4. Bump `lastUpdated` in both `lib/legal/privacy-no.ts` and
   `lib/legal/privacy-en.ts`, and note the change in the app.
