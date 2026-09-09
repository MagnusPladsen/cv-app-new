# Processors

Every vendor processing personal data on the operator's behalf, per GDPR
Art. 28. The machine-readable list is `lib/privacy/processors.ts`; the privacy
policy renders that list rather than repeating it, and a test fails if the app
contacts a host that is not on it.

## Data processing agreements

Neither vendor requires a separately signed agreement, and archived copies of
both are in `legal/`. But publishing a DPA is not the same as being covered by
one, and reading the documents produced a finding.

| Vendor | DPA | Covers us? |
|---|---|---|
| Supabase | `legal/SupaBase - Data Processing Addendum.pdf` | **Yes.** Incorporated into the terms already accepted, for all organisations. |
| Vercel | `legal/Vercel - Data Processing Addendum.pdf` | **No, not on the Hobby plan.** |

### The Vercel gap

The document says, in its opening section:

> This Addendum applies to Vercel's Processing of Personal Data as a Processor
> under the Agreement for Customers who are on **Enterprise and Pro plans**.

CVApp is on Hobby. Two consequences, and the second is the serious one:

1. **No Art. 28 processor agreement with the host.** GDPR requires one before
   a processor handles personal data on the controller's behalf, and Vercel
   handles IP addresses and session cookies on every request.
2. **No Standard Contractual Clauses for the US transfer.** The SCCs live
   inside the DPA. Functions execute in `iad1` (Washington DC), so without the
   DPA the transfer has no mechanism at all — it is not a disclosure question,
   which is what it looked like before the document was read.

**This is a launch blocker.** Options, roughly in order of cost:

- **Vercel Pro.** The DPA then applies, and region selection becomes available
  — which also lets function execution move to `fra1` and removes the transfer
  entirely. One change fixes both findings.
- **Move hosting** to a provider whose free or cheap tier includes a DPA and
  an EEA region.
- **Do not launch publicly or charge money** until one of the above.

Worth checking separately: Vercel's Hobby terms restrict that plan to
non-commercial personal use, which a public CV product may not satisfy
regardless of the privacy question.

### Keeping the archive honest

A DPA incorporated by reference can be amended by the vendor, so "we accepted
their terms" is not by itself an answer to *which* terms applied when. Both
PDFs are committed, so the commit date is the retrieval evidence. Neither
vendor page offers a download; they were printed to PDF from the web page.

Re-retrieve and re-commit after any plan change.

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
