# Data inventory

Every field CVApp stores. Kept in step with the code by
`lib/schema/__tests__/data-inventory.test.ts`, which fails when a schema field
is missing here or listed here after being removed.

**Legal basis for the CV itself: Art. 6(1)(b), contract performance.** Storing
and rendering the CV *is* the service. It is not consent, and must not be
turned into consent: a withdrawable basis for the core function would mean
the app had to stop rendering a CV the moment consent was withdrawn.

**Controller:** Magnus Pladsen (a natural person; no registered company, and
therefore no organisation number), `magnus_pladsen@hotmail.com`.

## Where it lives

| Store | Contents | Retention |
|---|---|---|
| The browser's `localStorage` | Every CV, for signed-out and signed-in users alike | Until the user deletes the CV, clears browser data, or signs out |
| Supabase `cv_documents` (AWS `eu-central-1`, Germany) | A copy of each CV, for signed-in users | Until the user deletes the CV or the account. A deleted row is kept as a tombstone holding only its id and timestamps, so other devices learn about the deletion; the payload is blanked at deletion time |
| Supabase `auth.users` (same region) | Email, OAuth provider id, timestamps | Until account deletion |
| Vercel server logs | IP address, user agent, request path | Per the hosting provider's own retention. No CV content is logged |

No data is transferred outside the EEA by the database. The hosting region is
still to be confirmed — see `docs/privacy/README.md`.

## CV document fields

Legal basis for every row below is Art. 6(1)(b). Every row is included in the
user's data export and removed by account deletion, so those columns are
stated once here rather than repeated 51 times: **exported: yes, deleted: yes**
for all of them.

| Field | Category | Purpose |
|---|---|---|
| `id` | Identifier | Addressing the document |
| `schemaVersion` | Technical | Migrating older saved CVs |
| `name` | Profile | The user's own label for this CV |
| `language` | Preference | Which language the CV's own labels print in |
| `paper` | Preference | A4 or Letter |
| `updatedAt` | Technical | Ordering, and deciding which copy wins when two devices disagree |
| `theme.templateId` | Preference | Chosen template |
| `theme.accent` | Preference | Chosen colour |
| `theme.fontPairId` | Preference | Chosen typeface pairing |
| `theme.density` | Preference | Chosen spacing |
| `personalia.firstName` | Profile | Appears on the CV |
| `personalia.lastName` | Profile | Appears on the CV |
| `personalia.title` | Profile | Appears on the CV |
| `personalia.email` | Contact | Appears on the CV |
| `personalia.phone` | Contact | Appears on the CV |
| `personalia.city` | Contact | Appears on the CV |
| `personalia.country` | Contact | Appears on the CV |
| `personalia.photo.dataUrl` | Profile image | Optional portrait, stored inline as a JPEG data URI. **Not biometric data:** it is never processed for identification. Re-encoded through a Canvas on upload, which discards EXIF including GPS coordinates |
| `personalia.showPhoto` | Preference | Whether the portrait is printed |
| `personalia.links.id` | Identifier | Addressing a link |
| `personalia.links.label` | Profile | Link text, e.g. "LinkedIn" |
| `personalia.links.url` | Profile | A profile or portfolio address the user chooses to publish on their CV |
| `sections.id` | Identifier | Addressing a section |
| `sections.enabled` | Preference | Whether the section prints |
| `sections.titleOverride` | Preference | A renamed section heading |
| `sections.type` | Technical | Which kind of section this is |
| `sections.text` | Free text | Summary prose. **May contain anything the user types** — see below |
| `sections.title` | Preference | A custom section's heading |
| `sections.shape` | Technical | Which layout a custom section uses |
| `sections.bullets` | Free text | A custom section's bullet points |
| `sections.entries.id` | Identifier | Addressing an entry |
| `sections.entries.role` | Employment/education | Job or course title |
| `sections.entries.organisation` | Employment/education | Employer or institution |
| `sections.entries.location` | Employment/education | Where the role was held |
| `sections.entries.from` | Employment/education | Start month |
| `sections.entries.to` | Employment/education | End month |
| `sections.entries.current` | Employment/education | Whether the role is ongoing |
| `sections.entries.description` | Free text | Achievements and duties. **May contain anything the user types** |
| `sections.entries.descriptionMode` | Technical | Bullets or prose |
| `sections.entries.name` | Certification / reference | A certificate's name, or a referee's name |
| `sections.entries.issuer` | Certification | Who issued the certificate |
| `sections.entries.date` | Certification | When it was issued |
| `sections.entries.url` | Certification | A verification link |
| `sections.entries.email` | **Third-party contact** | A referee's email — see below |
| `sections.entries.phone` | **Third-party contact** | A referee's phone — see below |
| `sections.items` | Profile | Interests, as free text the user types |
| `sections.items.id` | Identifier | Addressing a skill or language |
| `sections.items.name` | Profile | A skill or language name |
| `sections.items.level` | Profile | Self-assessed proficiency, 1–5 or CEFR |
| `sections.classes` | Profile | Driving licence classes |
| `sections.note` | Free text | A note about the licence |

## Third-party personal data

`sections.entries.name`, `role`, `organisation`, `email` and `phone` in a
references section describe a **referee**: someone who is not a user of
CVApp, never visited it, and has consented to nothing.

CVApp never contacts them. It stores what the user typed so it can be printed
on the user's own CV, and nothing else. The reference form tells the user they
are responsible for having the referee's permission. A referee who wants their
details removed can contact the controller.

## Free-text fields

`sections.text`, `sections.entries.description`, `sections.bullets`,
`sections.note` and `sections.items` accept anything the user types, and may
therefore contain Art. 9 special-category data — health, religion, ethnicity,
political views, trade union membership — if the user chooses to include it.

CVApp provides **no structured field** for any of those and asks for none of
them. The privacy policy tells users that what goes into free-text fields is
their choice and that they should avoid special-category data unless it is
necessary for the application they are making.

## Fields deliberately not collected

- **Norwegian national identity number (*fødselsnummer*)** — no lawful need,
  and personopplysningsloven § 12 attaches extra obligations. Test-enforced.
- **Date of birth** — was present in the schema but had no editor field and no
  renderer, so nothing could set or display it. Removed rather than
  inventoried, since a field no feature can use is storage with no purpose.
- **Gender, nationality, marital status** — never collected.
