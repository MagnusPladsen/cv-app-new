# GDPR & Privacy Implementation Spec — CV Builder (Norway/EEA)

**Purpose:** hand this to a coding agent as the requirements document for making a CV-building web app legally compliant under GDPR and Norwegian law.

**Jurisdiction:** Norway. GDPR applies via the EEA agreement, implemented through *personopplysningsloven* (2018). Supervisory authority: **Datatilsynet**. Cookies/tracking are governed by **ekomloven § 3-15** (new Electronic Communications Act, in force 1 Jan 2025), supervised jointly by Datatilsynet and Nkom.

**Note on risk level:** a CV builder is a high-sensitivity application. CVs contain name, contact details, employment history, education, and often free-text fields where users volunteer health information, trade union membership, religion, political activity, or ethnicity. This pushes parts of the app into GDPR Article 9 territory. Treat data minimisation and deletion as first-class features, not afterthoughts.

---

## 1. Roles and responsibilities

- The service operator is the **data controller** (*behandlingsansvarlig*) for user account data and CV content.
- Every third party that processes personal data on the operator's behalf is a **data processor** (*databehandler*): hosting, database, email sending, analytics, error tracking, payment provider, any LLM API used for text generation.
- A written **Data Processing Agreement (DPA)** under Art. 28 is required with each processor before production traffic. Most major vendors publish a standard DPA that can be accepted online — the task is to actually accept and archive it, not to draft one.
- The payment provider (e.g. Stripe) is usually an **independent controller** for payment data, not a processor. Do not store card data at any point; use a hosted checkout or Elements so card numbers never touch the application servers (this also keeps PCI scope minimal).

---

## 2. Data inventory (build this first)

Produce a machine-readable inventory at `docs/data-inventory.md` or similar. Every field the system stores must be listed with: field name, table, purpose, legal basis, retention period, and whether it is exported/deleted by the user-facing tools.

Expected categories in a CV builder:

| Category | Examples | Notes |
|---|---|---|
| Account data | email, hashed password, auth provider ID, created_at | Needed for the service |
| Profile/CV content | name, phone, address, photo, work history, education, skills, references | Core purpose |
| Free-text CV fields | summary, cover letters, custom sections | **May contain Art. 9 special-category data** |
| Uploaded files | existing CV PDFs, profile photos | Photos are not biometric data unless processed for identification |
| Usage data | logins, feature usage, IP addresses, user agent | IP is personal data |
| Billing data | subscription status, invoices, customer ID | Card data must never be stored |
| Support data | emails, tickets | Often contains everything above |

**Third-party references:** CVs list referees (name, phone, employer). These are personal data about people who are not users and have not consented. This is a real obligation, not a technicality — see §7.

---

## 3. Legal bases (Art. 6)

Map every processing purpose to exactly one basis. Do not use consent as a catch-all — consent is withdrawable, and if it is withdrawn the processing must stop.

| Purpose | Basis | Implementation |
|---|---|---|
| Creating and storing the user's CV | Art. 6(1)(b) — contract performance | No consent needed; it is the service |
| Account management, authentication | Art. 6(1)(b) | — |
| Billing, invoicing, accounting records | Art. 6(1)(c) — legal obligation (Norwegian *bokføringsloven* requires 5 years) | Retain invoices even after account deletion |
| Security logging, fraud/abuse prevention | Art. 6(1)(f) — legitimate interest | Document a balancing test (LIA) |
| Product analytics | Consent — Art. 6(1)(a) + ekomloven § 3-15 | Must be opt-in, off by default |
| Marketing email / newsletter | Consent | Separate checkbox, never pre-ticked, never bundled with signup |
| Sending CV text to an LLM API | Art. 6(1)(b) if it is a core advertised feature; otherwise consent | Be explicit in the privacy policy either way |

**Art. 9 special-category data:** the service should not deliberately collect it. Since users can type anything into free-text fields, the correct posture is:
- Do not create structured fields for health, religion, ethnicity, political views, or union membership.
- State in the privacy policy that users choose what to include in free-text fields and that they should avoid special-category data unless necessary.
- If the app must handle it (some countries expect a photo, date of birth, nationality on CVs), rely on Art. 9(2)(a) explicit consent, collected separately and logged.

---

## 4. Data subject rights — what to actually build

All of these must be answered within **one month** (Art. 12(3)), extendable by two months for complex requests. Build self-service where possible; a manual inbox process does not scale and misses deadlines.

Required functionality:

1. **Access (Art. 15)** — a "Download my data" button producing a complete export.
2. **Portability (Art. 20)** — the same export in a structured, commonly used, machine-readable format. JSON is fine. A PDF alone is not portability.
3. **Rectification (Art. 16)** — users can edit all their profile and CV fields. Usually already satisfied.
4. **Erasure (Art. 17)** — a "Delete my account" flow that actually deletes, not just sets `deleted = true`. See §5.
5. **Restriction (Art. 18)** — an account state where data is retained but not actively processed. A `processing_restricted` flag that blocks all non-storage operations is acceptable.
6. **Objection (Art. 21)** — an opt-out for anything based on legitimate interest, and an unconditional opt-out for direct marketing.
7. **Withdraw consent (Art. 7(3))** — must be as easy as giving it. If consent was a click, withdrawal must be a click, not an email to support.

Suggested implementation:

```
/settings/privacy
  - Download my data          → POST /api/privacy/export
  - Delete my account         → POST /api/privacy/delete (2-step confirm)
  - Cookie & tracking prefs   → re-opens consent manager
  - Marketing preferences     → toggle
  - Restrict processing       → POST /api/privacy/restrict
```

Export must include: account record, all CV documents and versions, uploaded file references (or the files themselves in a zip), consent history, and usage metadata. Run it as a background job and email a time-limited signed download link; do not build it synchronously.

**Identity verification:** before fulfilling access or deletion, confirm the requester controls the account (an authenticated session is sufficient; for email requests, require confirmation from the registered address). Do not demand ID documents by default — that is itself excessive collection.

---

## 5. Retention and deletion

Define and enforce retention. "We keep it forever" is not a policy.

Recommended defaults (adjust and document):

- **Active account data:** kept while the account is active.
- **Inactive accounts:** flag at 24 months of no login, email a warning, delete at 36 months. Implement as a scheduled job.
- **Deleted account:** hard-delete within **30 days** of the request. A short grace period for accidental deletion is defensible if disclosed.
- **Backups:** deletion from backups is not required to be immediate. Document the backup rotation (e.g. 30 days) and ensure deleted records are not restored into production. Restoring a backup must re-apply the deletion log.
- **Server/access logs:** 30–90 days.
- **Invoices and accounting records:** 5 years, per Norwegian bookkeeping law. Retain the minimum needed (name, amount, date, invoice number) and delete the rest of the account.
- **Support tickets:** 12–24 months.

Implementation requirements:

- Foreign keys with `ON DELETE CASCADE` from user → CVs → sections → files, or an explicit deletion service that walks every table. Write a test that creates a user with data in every table, deletes them, and asserts zero rows remain.
- Delete blob storage objects (photos, uploaded PDFs, generated PDFs), not just the DB rows.
- Purge the user from every processor: email provider contact lists, analytics, error tracker, CRM. Several of these have deletion APIs — call them.
- Anonymise rather than delete only where the data is genuinely needed in aggregate, and only if re-identification is impossible (hashing an email is **not** anonymisation — it is pseudonymisation and still personal data).

---

## 6. Processors, sub-processors and transfers

**Required:**
- Maintain a public sub-processor list in the privacy policy: vendor name, purpose, country of processing.
- Have a signed/accepted DPA with each one. Archive the PDFs.
- Notify users of new sub-processors (a changelog entry plus a policy update date is proportionate for a small consumer service).

**International transfers (Chapter V):**
- Transfers within the EEA need no extra mechanism. Norway is in the EEA.
- Transfers to countries with an adequacy decision (UK, Switzerland, Canada (commercial), Japan, South Korea, Brazil, and others) are permitted on that basis.
- Transfers to the US may rely on the **EU-US Data Privacy Framework** only if the specific recipient is self-certified — verify on the official DPF list, do not assume. Otherwise use **Standard Contractual Clauses** plus a **Transfer Impact Assessment**.
- The DPF's validity is under appeal at the CJEU (Case C-703/25 P, pending as of mid-2026) after the General Court upheld it in September 2025. Both predecessor frameworks (Safe Harbor, Privacy Shield) were struck down. **Design so vendors can be swapped**: put storage, email, and LLM calls behind interfaces rather than importing vendor SDKs throughout the codebase, and prefer EU regions where the vendor offers them.

**Practical preference order for this app:** EU/EEA hosting region → EEA-based vendor → adequacy-country vendor → US vendor with DPF certification + SCCs.

---

## 7. Third-party personal data (referees and named people in CVs)

This is the obligation most CV products get wrong.

When a user enters a referee's name and phone number, the operator processes personal data about someone who never visited the site. Art. 14 requires informing that person — unless it would involve disproportionate effort (Art. 14(5)(b)), which is arguable for a tool that only stores data and never contacts referees.

Minimum defensible approach:

- Never contact referees automatically. If the product ever emails them, Art. 14 notice becomes clearly mandatory and must be sent within one month.
- Add an in-product notice at the point of entry: a line under the references field telling the user they are responsible for having the referee's permission to share their details.
- Cover third-party data in the privacy policy with a contact route for such a person to request deletion.
- Do not index or make CVs publicly accessible by default. If public CV pages/sharing links are a feature: default to private, use unguessable share tokens, add `noindex`, and allow revocation.

---

## 8. AI features

If the app calls an LLM to generate or improve CV text, this is a distinct processing activity that must be disclosed.

Requirements:

- Name the AI provider in the privacy policy and sub-processor list, with the processing country.
- Use an API tier with a **DPA in place** and where inputs are **not used for model training**. Verify this in the vendor's terms; consumer tiers often differ from API tiers.
- Check retention: several providers retain API inputs for abuse monitoring for a period (commonly 30 days). Disclose it. Zero-retention options exist with some providers — prefer them if available.
- Minimise the payload: send only the fields needed for the requested generation, not the whole profile. Strip contact details, address, and date of birth from prompts where they add nothing.
- Consider making AI features opt-in per action, with a clear indication that text is sent to a third party. This is a strong trust signal and simplifies the legal basis.
- **Art. 22 (automated decision-making):** does not apply here — a CV generator does not make decisions with legal effects about the user. Do not add scoring, ranking, or "employability" assessments without a fresh legal analysis, since that changes the picture.
- **EU AI Act:** a CV formatting/writing tool used by the job seeker themselves is not a high-risk system. Systems used *by employers* to evaluate or rank candidates are high-risk under Annex III. Stay on the job-seeker side of that line, or take advice before crossing it.

---

## 9. Cookies and tracking (ekomloven § 3-15)

Norway's rules changed on 1 January 2025. The old *ekomloven § 2-7b* is repealed — do not cite it in the cookie policy. Consent must now meet the GDPR standard: freely given, specific, informed and unambiguous, given **before** the cookie is set.

Rules to implement:

- **No banner needed** if the site sets only strictly necessary cookies. Exempt: cookies required to transmit communication, and cookies strictly necessary to deliver a service the user explicitly requested — in practice login sessions, CSRF tokens, cart, language choice.
- **Not exempt:** Google Analytics, Meta Pixel, LinkedIn Insight Tag, and similar. Also covered are localStorage, fingerprinting, and any read/write on the user's device — the rule is technology-neutral and applies whether or not the data is personal data.
- If a banner is needed it must:
  - Block all non-essential scripts until consent is given (default state = rejected).
  - Offer **"Reject all" as prominently and with the same number of clicks as "Accept all"**. No dark patterns, no greyed-out reject button, no pre-ticked boxes, no "continued use = consent".
  - Be granular by purpose.
  - Allow withdrawal as easily as granting — a persistent link in the footer that reopens the manager.
  - Store a consent record: what was consented to, when, and the policy version.
- Datatilsynet issued its first fine under the new law in February 2025 and signalled stricter enforcement thereafter.

**Simplest compliant path for this project:** use privacy-friendly, cookieless analytics hosted in the EU (Plausible, Fathom, Simple Analytics, or self-hosted Umami) and ship **no cookie banner at all**. This is less code, better UX, and less risk. Only add a consent manager if the business genuinely needs ad-tech.

---

## 10. Security (Art. 32)

Implement, and be able to evidence:

- **Transport:** HTTPS everywhere, HSTS, TLS 1.2+ only.
- **At rest:** encrypted database and blob storage (managed providers usually give this by default — confirm and note it).
- **Authentication:** Argon2id or bcrypt for passwords, or delegate to a managed auth provider. Rate-limit login, signup, password reset, and export/delete endpoints. Offer 2FA if feasible.
- **Sessions:** `httpOnly`, `Secure`, `SameSite=Lax` cookies; rotate on privilege change; sensible expiry.
- **Authorisation:** every CV/file endpoint must verify ownership server-side. IDOR is the single most likely breach vector in this kind of app. Use UUIDv4/ULID rather than sequential IDs, and write tests asserting user A cannot read user B's documents. If using Postgres/Supabase, enable Row Level Security and test the policies.
- **Uploads:** validate MIME type and magic bytes, cap size, store outside the web root or in a private bucket, serve via short-lived signed URLs, strip EXIF (including GPS) from images.
- **Headers:** CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **Secrets:** environment variables only, never committed. Rotate anything that has been in git history.
- **Logging:** log authentication events and admin access; do **not** log CV content, full request bodies, or auth tokens. Scrub PII before it reaches the error tracker (most SDKs have a `beforeSend` hook — use it).
- **Admin access:** minimise it. If an admin panel can read user CVs, restrict by role, log every access, and say so in the privacy policy.
- **Dependencies:** automated dependency updates and vulnerability scanning in CI.
- **Backups:** encrypted, access-controlled, tested restore, documented rotation.

---

## 11. Privacy by design and by default (Art. 25)

Concrete implementation tasks:

- Collect only what the feature needs. No date of birth, national ID number (*fødselsnummer*), gender, or nationality unless a specific export template requires it — and then make it optional.
- Never collect a Norwegian national identity number. There is no lawful need for one here, and it carries additional obligations under personopplysningsloven § 12.
- Default all sharing to private.
- Default all optional analytics/marketing to off.
- Prefer client-side PDF generation where feasible so CV content need not hit the server for rendering.
- Consider client-side encryption for stored CV content if the threat model warrants it (note: it breaks server-side search and AI features, so this is a real trade-off, not a free win).

---

## 12. Documentation to produce

These are deliverables, not code, but the agent can draft them:

1. **Privacy policy** (*personvernerklæring*) — in Norwegian if the audience is Norwegian, and in every language the UI supports. Must cover, per Art. 13:
   - identity and contact details of the controller (name, org.nr., address, email)
   - purposes and legal basis for each processing activity
   - recipients/categories of recipients (the sub-processor list)
   - transfers outside the EEA and the safeguard relied on
   - retention periods
   - the full list of data subject rights, including the right to complain to Datatilsynet
   - whether providing data is a contractual requirement and the consequence of not providing it
   - the existence of any automated decision-making (state that there is none, if so)
   - the AI processing description
2. **Cookie declaration** — only if cookies beyond the strictly necessary are used. Cite *ekomloven § 3-15*, not § 2-7b.
3. **Terms of service** — separate document; do not bury privacy terms inside it.
4. **Record of Processing Activities (ROPA, Art. 30)** — a table of processing activities, purposes, categories of data and data subjects, recipients, transfers, retention, and security measures. The Art. 30 exemption for organisations under 250 employees does **not** apply here, because processing is regular and not occasional. Keep it as a maintained markdown file.
5. **Legitimate Interest Assessments** for anything relying on Art. 6(1)(f).
6. **Data breach response plan** — see §13.
7. **DPIA (Art. 35)** — likely required if processing is large-scale, involves special-category data, or uses new technology in a way that risks the rights of individuals. A CV service with AI features and free-text fields that may contain Art. 9 data is a plausible candidate. Do a screening assessment and document the conclusion either way. Datatilsynet publishes a list of processing types that always require one.
8. **DPO:** not required for a small operation of this kind — core activity is not large-scale monitoring or large-scale Art. 9 processing. Document the assessment. Still name a privacy contact email in the policy.

---

## 13. Data breach handling

- Notify **Datatilsynet within 72 hours** of becoming aware of a breach, unless it is unlikely to result in a risk to individuals (Art. 33). Notification is filed through Datatilsynet's online form.
- Notify **affected users without undue delay** where the risk is high (Art. 34).
- Maintain an internal breach register including breaches that were not reportable, with the reasoning.
- Build the capability now: an incident runbook, the ability to identify which users were affected and in what time window, and a tested method for emailing all affected accounts.

---

## 14. Consequences of getting it wrong

- Fines up to **€20 million or 4% of global annual turnover**, whichever is higher, for the most serious infringements (Art. 83(5)); up to €10m/2% for others. In practice Datatilsynet's fines against small Norwegian businesses are far smaller, but corrective orders and mandatory remediation are common and disruptive.
- Cookie violations are now enforceable by Datatilsynet under personopplysningsloven, not only under ekomloven — which is what changed the risk level in 2025.
- Reputational damage for a service handling job-search data is severe and hard to recover from.

---

## 15. Implementation checklist, ordered

**Blocking before charging money or launching publicly**

- [ ] Data inventory written
- [ ] Privacy policy published and linked from footer, signup, and checkout
- [ ] DPAs accepted and archived with all processors
- [ ] Hosting and database in an EU/EEA region
- [ ] Account deletion that genuinely deletes, with an automated test
- [ ] Data export (JSON) working
- [ ] Ownership checks on every CV/file endpoint, with tests
- [ ] No card data touching the servers
- [ ] PII scrubbing configured in the error tracker
- [ ] Either cookieless analytics, or a compliant consent banner with equal-prominence reject
- [ ] Passwords hashed with Argon2id/bcrypt; rate limiting on auth endpoints
- [ ] Signed, expiring URLs for uploaded and generated files
- [ ] EXIF stripping on image uploads

**Shortly after launch**

- [ ] ROPA (Art. 30) written and maintained
- [ ] Retention jobs scheduled (inactive accounts, log rotation, deletion of expired exports)
- [ ] Breach response runbook
- [ ] DPIA screening documented
- [ ] Sub-processor list published with a change process
- [ ] LIA for security/anti-abuse processing
- [ ] Restriction (Art. 18) and objection (Art. 21) mechanisms
- [ ] Backup deletion reconciliation

**If/when specific features are added**

- [ ] Public CV sharing → private by default, revocable tokens, `noindex`
- [ ] Emailing referees → full Art. 14 notice flow
- [ ] Employer-side features → re-assess AI Act high-risk classification
- [ ] Non-EEA users → check local law (UK GDPR, and note that the US has state-level laws)

---

## 16. Out of scope for a coding agent

Get a Norwegian lawyer or a privacy consultant to review before charging money:

- Final wording of the privacy policy and terms
- The DPIA conclusion, if one is required
- Whether the AI feature's legal basis is contract or consent for this specific product
- The Art. 14 position on referee data, if the product ever contacts them

Useful primary sources: **datatilsynet.no** (guidance in Norwegian, much of it also in English), **lovdata.no** for personopplysningsloven and ekomloven, **forbrukertilsynet.no** for consumer-facing terms.

---

*This document describes legal requirements as a technical specification. It is not legal advice.*
