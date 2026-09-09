# Privacy Foundations Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear every item on the spec's "Blocking before charging money or launching publicly" list that is not already satisfied, so CVApp can take money and be advertised publicly without a known compliance gap.

**Architecture:** Privacy obligations become code and tests wherever they can be, and maintained markdown where they cannot. The pattern throughout: a document that can drift from the code gets a test that fails when it drifts. The data inventory is checked against the zod schema; the deletion guarantee is checked against the database; the privacy policy's sub-processor list is checked against the environment the app actually talks to.

**Tech Stack:** As Plans 1-4. No new runtime dependencies. New: `next.config.ts` response headers, one Postgres verification script, and `docs/privacy/`.

**Spec:** `docs/superpowers/specs/gdpr-privacy-spec.md`
**Predecessors:** Plans 1-4, all complete.

---

## What the spec already gets for free

Do not re-implement these. Each is stated with where it lives, because a
reviewer will otherwise ask.

| Spec requirement | Already satisfied by |
|---|---|
| §5 deletion that genuinely deletes | `supabase/migrations/20260908000002_delete_own_account.sql` plus `on delete cascade` on `cv_documents.user_id`. **The automated test is missing — Task 3.** |
| §10 ownership checks on every endpoint | Row Level Security on `cv_documents`, all four policies scoped to `auth.uid()`. Verified live: an anonymous insert is refused with `42501`. |
| §10 non-sequential ids | `crypto.randomUUID()` in `lib/store/documents.ts` |
| §10 no card data | No payment provider integrated. |
| §10 password hashing | No passwords exist. OAuth only; Supabase holds the identity. |
| §10 secrets in env only | `.gitignore` ignores `.env*`; only the publishable key ships, by design (README). |
| §9 cookie banner | Not needed. There is no analytics, tracking, or error-reporting dependency in `package.json`, and no third-party script in any layout. The spec's "simplest compliant path" is already the state of the app. **Task 8 adds a test so it stays that way.** |
| §11 client-side PDF generation | The print pipeline clones the live DOM into an iframe; CV content never reaches the server for rendering. |
| §11 no national identity number | `personaliaSchema` has no such field, and must never gain one. |
| §10, §15 EXIF stripping on image uploads | `lib/image/compress.ts:72` re-encodes every photo through a Canvas at 600px/JPEG q0.82, which discards the original bytes and every EXIF tag including GPS. **Task 8 adds a test so it stays true.** |
| §11 sharing private by default | There is no sharing feature. |
| §4 rectification (Art. 16) | The editor edits every field. |
| §4 portability (Art. 20) | `serialiseBundle` already writes JSON. **Incomplete — Task 4.** |
| §6 EEA hosting | The Supabase database resolves to an AWS Europe IPv6 allocation. **Confirm the exact region in the dashboard — Task 0.** |

## What this plan deliberately does not cover

- **§3, §8 AI features.** There are none. No LLM is called anywhere in the
  codebase. If one is added, that is a fresh legal basis and its own plan.
- **§3, §5 billing and invoices.** No payment provider is integrated. The
  5-year *bokføringsloven* retention obligation begins when one is.
- **§9 consent manager.** Only needed if non-essential cookies are added.
  Task 8 makes adding one fail a test, which is the point at which to revisit.
- **Post-launch items** — ROPA, retention jobs, restriction (Art. 18),
  objection (Art. 21), breach runbook, DPIA screening, LIA, backup deletion
  reconciliation. These are the spec's own second tier. They become Plan 6;
  several depend on decisions (retention periods, whether analytics is ever
  added) that are better made once the service is live.
- **§16 everything reserved for a lawyer.** The privacy policy this plan
  writes is a complete, accurate draft of the app's actual behaviour. It is
  not legal advice and must be reviewed before money changes hands. Task 6
  puts that statement in the repo, not just in this sentence.

---

## Global Constraints

Plans 1-4's constraints still apply. Re-read them in
`docs/superpowers/plans/2026-09-08-cvapp-accounts.md`. New ones, taken from
the spec, all load-bearing:

- **Never add a field for a Norwegian national identity number
  (*fødselsnummer*).** Spec §11: "There is no lawful need for one here, and it
  carries additional obligations under personopplysningsloven § 12." Task 2
  makes adding one fail a test.
- **Never create structured fields for health, religion, ethnicity, political
  views, or union membership** (spec §3). Free-text fields may contain
  anything; that is the user's choice and is addressed in the policy, not by
  a schema field.
- **`birthDate` is removed, not merely kept optional.** It exists at
  `lib/schema/cv.ts:181` but has no editor field and no renderer - a
  repo-wide search finds no other use. Spec §11 says collect only what the
  feature needs; a field no feature can populate or display is storage with
  no purpose, and inventorying it would document a purpose that does not
  exist. Task 2 removes it. If a date of birth is ever genuinely wanted for a
  country's CV conventions, add it back with a UI, a renderer and an
  inventory row in the same change.
- **Cite *ekomloven § 3-15*, never § 2-7b.** The old section was repealed on
  1 January 2025. Spec §9.
- **Never log CV content, full documents, request bodies, or tokens**
  (spec §10). Task 8 tests this.
- **Consent is not a catch-all** (spec §3). Storing and rendering a CV is
  Art. 6(1)(b), contract performance. Do not add a consent checkbox for it;
  a withdrawable basis for the core service would be wrong.
- **Every new user-facing string goes in both message catalogues.**
  Test-enforced, as ever.
- **Verification runs unpiped:** `bun run test`, `bun run typecheck`,
  `bun run lint` as bare commands.

---

### Task 0: Confirm hosting and processors (manual, blocking)

Three console tasks and one archive. Nothing later depends on them at build
time, so the rest of the plan can proceed in parallel — but the launch
checklist is not clear until these are done.

- [ ] **Step 1: Record the Supabase region**

Supabase dashboard → Project Settings → General. Note the exact region. The
database currently resolves to an AWS Europe IPv6 allocation
(`2a05:d014:…`), which is consistent with an EEA region, but the dashboard is
the authoritative record and the ROPA will need the exact value.

If it is *not* an EEA region, stop and raise it: spec §6 puts EEA hosting
first in the preference order, and moving a project region means recreating
it, which is far cheaper now than after launch.

- [ ] **Step 2: Accept and archive the DPAs**

Two processors handle personal data today:

| Processor | Purpose | Where |
|---|---|---|
| Supabase | Auth and CV storage | The region from Step 1 |
| Vercel | Hosting, edge delivery, server logs | Check the deployment region |

Accept each vendor's standard DPA (both publish one; neither needs drafting)
and save the PDFs outside the repo — they contain account identifiers and do
not belong in git. Record the date accepted; Task 6 lists both vendors in the
privacy policy and Task 7 tests that the list matches what the app talks to.

- [ ] **Step 3: Confirm the Vercel deployment region**

Vercel project → Settings → Functions. If it is not an EEA region, change it.
Server logs contain IP addresses, which spec §2 correctly classes as personal
data.

- [ ] **Step 4: Write down what you found**

Fill in the region and DPA dates in `docs/privacy/processors.md`, created by
Task 7. Until then, keep them in the PR description.

---

### Task 1: The privacy documentation directory

**Files:**
- Create: `docs/privacy/README.md`

**Interfaces:**
- Produces: the directory every later task writes into, and the statement of
  what these documents are and are not.

- [ ] **Step 1: Write it**

```markdown
<!-- docs/privacy/README.md -->
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/privacy/README.md
git commit -m "docs(privacy): add the privacy documentation directory"
```

---

### Task 2: The data inventory, checked against the schema

**Files:**
- Create: `docs/privacy/data-inventory.md`
- Create: `lib/schema/field-paths.ts`
- Create: `lib/schema/__tests__/data-inventory.test.ts`

**Interfaces:**
- Produces: `collectFieldPaths(schema: z.ZodType): string[]` — every leaf
  field path in a zod schema, dot-separated, e.g. `personalia.firstName`.
- The inventory is the spec's §2 deliverable and the input to the privacy
  policy's retention and purpose tables.

This is the task that stops the inventory rotting. A markdown table nobody
checks is worth nothing a year from now.

- [ ] **Step 1: Write the failing test**

```ts
// lib/schema/__tests__/data-inventory.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { cvDocumentSchema } from '@/lib/schema/cv'
import { collectFieldPaths } from '@/lib/schema/field-paths'

const inventory = readFileSync('docs/privacy/data-inventory.md', 'utf8')

/** Field paths named in the first column of any markdown table row. */
function documentedFields(markdown: string): Set<string> {
  const rows = markdown.split('\n').filter((line) => line.startsWith('| `'))
  return new Set(rows.map((line) => line.split('|')[1]!.trim().replaceAll('`', '')))
}

describe('the data inventory', () => {
  it('lists every field the CV schema stores', () => {
    // GDPR Art. 30 and the spec's §2: a field that is stored but not
    // inventoried is a field nobody decided a retention period or a legal
    // basis for. Adding one to the schema must fail here until it is
    // documented.
    const documented = documentedFields(inventory)
    const missing = collectFieldPaths(cvDocumentSchema).filter(
      (path) => !documented.has(path),
    )

    expect(missing, `undocumented fields: ${missing.join(', ')}`).toEqual([])
  })

  it('documents nothing that no longer exists', () => {
    const actual = new Set(collectFieldPaths(cvDocumentSchema))
    const stale = [...documentedFields(inventory)].filter(
      (path) => path.includes('.') && !actual.has(path),
    )

    expect(stale, `inventory lists removed fields: ${stale.join(', ')}`).toEqual([])
  })

  it('never gains a national identity number', () => {
    // Spec §11: no lawful need, and personopplysningsloven § 12 attaches
    // extra obligations to it. This is a floor, not a preference.
    const banned = /f(ø|o)dselsnummer|nationalId|personnummer|ssn|socialSecurity/i
    const offending = collectFieldPaths(cvDocumentSchema).filter((path) =>
      banned.test(path),
    )

    expect(offending).toEqual([])
  })

  it('stores no date of birth', () => {
    // Removed in this task: it was in the schema but had no editor field and
    // no renderer, so nothing could set or show it. Spec §11 is collect only
    // what the feature needs. If it comes back, it comes back with a UI and
    // an inventory row.
    expect(collectFieldPaths(cvDocumentSchema)).not.toContain('personalia.birthDate')
  })
})

function minimalDocument() {
  // Uses the real factory so this test tracks the schema rather than a copy.
  return createEmptyDocument({}, { newId: () => 'id-1', now: () => 0 })
}
```

Add the import for the factory at the top:

```ts
import { createEmptyDocument } from '@/lib/schema/defaults'
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test lib/schema/__tests__/data-inventory.test.ts`
Expected: FAIL — cannot resolve `@/lib/schema/field-paths`.

- [ ] **Step 3: Implement the field walker**

```ts
// lib/schema/field-paths.ts
import { z } from 'zod'

/**
 * Every leaf field path in a zod schema, dot-separated.
 *
 * Array element and union member paths collapse to the array's own path:
 * `sections.entries.role` describes every entry, and inventorying each index
 * separately would say nothing extra about what is stored.
 */
export function collectFieldPaths(schema: z.ZodType, prefix = ''): string[] {
  const def = schema as unknown as { _def?: { typeName?: string } }
  const unwrapped = unwrap(schema)

  if (unwrapped instanceof z.ZodObject) {
    return Object.entries(unwrapped.shape).flatMap(([key, value]) =>
      collectFieldPaths(value as z.ZodType, prefix ? `${prefix}.${key}` : key),
    )
  }

  if (unwrapped instanceof z.ZodArray) {
    return collectFieldPaths(unwrapped.element as z.ZodType, prefix)
  }

  if (unwrapped instanceof z.ZodUnion || unwrapped instanceof z.ZodDiscriminatedUnion) {
    const options = unwrapped.options as z.ZodType[]
    return [...new Set(options.flatMap((option) => collectFieldPaths(option, prefix)))]
  }

  void def
  return prefix ? [prefix] : []
}

/** Strips optional, nullable, default and effects wrappers. */
function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema
  for (let i = 0; i < 10; i += 1) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap() as z.ZodType
      continue
    }
    if (current instanceof z.ZodDefault) {
      current = current.removeDefault() as z.ZodType
      continue
    }
    return current
  }
  return current
}
```

> **Check before writing this:** zod v4 renamed some class internals. Run
> `bun run test lib/schema/__tests__/data-inventory.test.ts` and, if
> `instanceof` fails to narrow, inspect a schema in a scratch test with
> `console.log(Object.getPrototypeOf(personaliaSchema).constructor.name)` and
> adjust. Do not reach for `any` — the walker's whole value is that it tracks
> the real schema.

- [ ] **Step 3b: Remove the unreachable birthDate field**

In `lib/schema/cv.ts`, delete the `birthDate: z.string().optional(),` line
from `personaliaSchema`.

No document migration is needed: the field is optional and zod strips unknown
keys, so a stored CV that somehow carries one still parses and simply loses
it. Check that nothing referenced it before deleting:

```bash
grep -rn "birthDate" lib components app
```

Expected: hits only in `lib/schema/cv.ts` and possibly a test fixture. If
anything else appears, stop - the premise for removing it was that nothing
uses it.

- [ ] **Step 4: Write the inventory**

Run the walker once to get the exact list, so the document matches the code
rather than someone's memory:

```bash
bun -e "
import { cvDocumentSchema } from './lib/schema/cv'
import { collectFieldPaths } from './lib/schema/field-paths'
for (const path of collectFieldPaths(cvDocumentSchema)) console.log(path)
"
```

Then write `docs/privacy/data-inventory.md` with a row per field. The header
and the first rows, to fix the format the test parses (first column, in
backticks):

```markdown
# Data inventory

Every field CVApp stores. Kept in step with the code by
`lib/schema/__tests__/data-inventory.test.ts`, which fails when a schema
field is missing here.

**Legal basis throughout the CV itself: Art. 6(1)(b), contract performance.**
Storing and rendering the CV *is* the service. It is not consent, and must
not be turned into consent: a withdrawable basis for the core function would
mean the app had to stop rendering a CV on withdrawal.

## Where it lives

| Store | Contents | Retention |
|---|---|---|
| The browser's `localStorage` | Every CV, for signed-out and signed-in users alike | Until the user deletes the CV, clears browser data, or signs out |
| Supabase `cv_documents` | A copy of each CV, for signed-in users | Until the user deletes the CV or the account; tombstone rows retain id and timestamps only |
| Supabase `auth.users` | Email, OAuth provider id, timestamps | Until account deletion |
| Vercel server logs | IP address, user agent, request path | Per Vercel's retention; no CV content is logged |

## CV document fields

| Field | Category | Purpose | Exported | Deleted |
|---|---|---|---|---|
| `id` | Identifier | Addressing the document | yes | yes |
| `name` | Profile | The user's own label for this CV | yes | yes |
| `personalia.firstName` | Profile | Appears on the CV | yes | yes |
| `personalia.lastName` | Profile | Appears on the CV | yes | yes |
| `personalia.title` | Profile | Appears on the CV | yes | yes |
| `personalia.email` | Contact | Appears on the CV | yes | yes |
| `personalia.phone` | Contact | Appears on the CV | yes | yes |
| `personalia.city` | Contact | Appears on the CV | yes | yes |
| `personalia.country` | Contact | Appears on the CV | yes | yes |
| `personalia.birthDate` | Profile | Optional; some countries' CV conventions expect it | yes | yes |
| `personalia.photo.dataUrl` | Profile image | Optional portrait, stored inline as a data URI. Not biometric: never processed for identification | yes | yes |
```

Continue for every path the walker printed. Add a closing section:

```markdown
## Third-party personal data

The references section stores a referee's name, role, employer, email and
phone. These are personal data about someone who is not a user of CVApp and
has not consented. CVApp never contacts them — see the privacy policy and
`components/editor/` reference form notice.

## Free-text fields

`summary`, entry bullet points, and custom sections accept anything the user
types, and may therefore contain Art. 9 special-category data if the user
chooses to include it. CVApp provides no structured field for health,
religion, ethnicity, political views or union membership, and does not ask
for any of them.
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test lib/schema`
Expected: PASS. If `missing` is non-empty, the message names the fields —
add them to the table rather than weakening the test.

- [ ] **Step 6: Commit**

```bash
bun run test
bun run typecheck
bun run lint
git add docs/privacy lib/schema
git commit -m "docs(privacy): inventory every stored field, enforced by test"
```

---

### Task 3: Prove deletion actually deletes

**Files:**
- Create: `supabase/tests/delete_own_account.sql`
- Modify: `docs/superpowers/plans/2026-09-08-cvapp-accounts-verification.md`

**Interfaces:**
- Produces: a SQL script that creates a user with data, deletes them through
  the real function, and fails loudly if anything survives.

Spec §5 and the §15 checklist both require this, and the spec is specific
about why: `deleted = true` is not erasure. The cascade is declared, but a
declared cascade nobody has exercised is a belief, not a guarantee.

**A note on why this is SQL and not Vitest.** Automating it in the test suite
would need a live Postgres, which means adopting the Supabase CLI and a local
stack. That is a real dependency decision with its own cost, and the project
has deliberately kept its tooling small. This script runs in the dashboard
SQL editor in about ten seconds and gives the same evidence. If the CLI is
adopted later, this file becomes a `supabase test db` case unchanged.

- [ ] **Step 1: Write the script**

```sql
-- supabase/tests/delete_own_account.sql
--
-- Proves GDPR Art. 17 erasure is real: a deleted user leaves no rows behind.
-- Run in the Supabase SQL editor. It rolls back, so it is safe against a
-- production database, and it raises an exception rather than returning a
-- row you might not read.
begin;

do $$
declare
  victim uuid := gen_random_uuid();
  bystander uuid := gen_random_uuid();
  leftover integer;
  bystander_rows integer;
begin
  -- Two users, so the test also catches a cascade that deletes too much.
  insert into auth.users (id, instance_id, aud, role, email)
  values
    (victim, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'victim@example.test'),
    (bystander, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bystander@example.test');

  insert into public.cv_documents (id, user_id, name, doc, updated_at)
  values
    (gen_random_uuid(), victim, 'CV 1', '{"a":1}'::jsonb, 1),
    (gen_random_uuid(), victim, 'CV 2', '{"a":2}'::jsonb, 2),
    (gen_random_uuid(), bystander, 'Theirs', '{"a":3}'::jsonb, 3);

  -- The real deletion path, not a hand-written DELETE: this is what the
  -- application calls, so this is what must be proven.
  delete from auth.users where id = victim;

  select count(*) into leftover from public.cv_documents where user_id = victim;
  if leftover <> 0 then
    raise exception 'ERASURE FAILED: % cv_documents rows survived deletion', leftover;
  end if;

  select count(*) into bystander_rows from public.cv_documents where user_id = bystander;
  if bystander_rows <> 1 then
    raise exception 'CASCADE TOO WIDE: another user lost data (% rows left)', bystander_rows;
  end if;

  raise notice 'OK: erasure removed every row for the deleted user, and only that user';
end $$;

rollback;
```

- [ ] **Step 2: Run it**

Paste into the Supabase SQL editor and run. Expected: the notice `OK:
erasure removed every row…`. Any exception is a real finding — stop and fix
the cascade before continuing.

- [ ] **Step 3: Add it to the verification checklist**

In `docs/superpowers/plans/2026-09-08-cvapp-accounts-verification.md`, add
above check 8:

```markdown
- [ ] **7b. Erasure leaves nothing behind.** Run
      `supabase/tests/delete_own_account.sql` in the SQL editor. It must
      print `OK: erasure removed every row…`. This is the Art. 17 evidence;
      check 8 exercises the user-facing flow, this one proves the database
      keeps its promise.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/tests docs/superpowers/plans
git commit -m "test(privacy): prove account deletion leaves no rows behind"
```

---

### Task 4: A complete data export

**Files:**
- Create: `lib/privacy/export.ts`
- Create: `lib/privacy/__tests__/export.test.ts`
- Modify: `components/auth/AccountPanel.tsx`
- Modify: `messages/no.json`, `messages/en.json`

**Interfaces:**
- Consumes: `serialiseBundle`, `bundleFilename` from `@/lib/store/backup`;
  `SessionUserDto` from `@/lib/auth/dal`; `CvDocument` from
  `@/lib/schema/cv`.
- Produces:
  ```ts
  type PrivacyExport = {
    exportedAt: string
    format: 'cvapp-privacy-export'
    formatVersion: 1
    account: { id: string; email: string | null; provider: string | null } | null
    documents: CvDocument[]
    localSettings: Record<string, string>
    notes: string[]
  }
  function buildPrivacyExport(input: {...}): PrivacyExport
  function privacyExportFilename(now?: Date): string
  ```

Spec §4 requires the export to cover "account record, all CV documents and
versions, uploaded file references … consent history, and usage metadata".
Today's export is the CV documents alone, which satisfies portability
(Art. 20) but not access (Art. 15).

What the export can honestly contain, given this app:

- **Account record** — id, email, provider. Held by Supabase Auth.
- **Documents** — already exported. Photos are inline data URIs, so the
  "uploaded files" the spec mentions travel inside the JSON already.
- **Local settings** — the `cvapp:*` flags in `localStorage`. Small, but they
  are data held on the user's behalf and cost nothing to include.
- **Versions** — undo history is in memory only and is never persisted, so
  there are no stored versions to export. The export says so rather than
  staying silent; an export that quietly omits a category is the failure
  mode Art. 15 exists to prevent.
- **Usage metadata** — CVApp keeps none. Also stated.

- [ ] **Step 1: Write the failing test**

```ts
// lib/privacy/__tests__/export.test.ts
import { describe, expect, it } from 'vitest'

import { createEmptyDocument } from '@/lib/schema/defaults'
import { buildPrivacyExport, privacyExportFilename } from '@/lib/privacy/export'

const doc = () => createEmptyDocument({ name: 'CV' }, { newId: () => 'id-1', now: () => 0 })

const account = { id: 'user-a', email: 'ola@example.no', provider: 'google' }

describe('buildPrivacyExport', () => {
  it('includes the account record, which the CV bundle alone does not', () => {
    const result = buildPrivacyExport({
      account,
      documents: [doc()],
      localSettings: {},
      now: new Date('2026-09-09T10:00:00Z'),
    })

    expect(result.account).toEqual(account)
    expect(result.documents).toHaveLength(1)
    expect(result.exportedAt).toBe('2026-09-09T10:00:00.000Z')
  })

  it('works for a signed-out user, who is still entitled to their data', () => {
    const result = buildPrivacyExport({
      account: null,
      documents: [doc()],
      localSettings: {},
    })

    expect(result.account).toBeNull()
    expect(result.documents).toHaveLength(1)
  })

  it('carries the local settings held on the user behalf', () => {
    const result = buildPrivacyExport({
      account,
      documents: [],
      localSettings: { 'cvapp:guest-export:v1': '1' },
    })

    expect(result.localSettings).toEqual({ 'cvapp:guest-export:v1': '1' })
  })

  it('states the categories it holds none of, rather than omitting them silently', () => {
    // Art. 15 is about the user knowing what is held. An export that just
    // leaves out "usage data" is indistinguishable from one that forgot.
    const result = buildPrivacyExport({ account, documents: [], localSettings: {} })

    expect(result.notes.join(' ')).toMatch(/no usage/i)
    expect(result.notes.join(' ')).toMatch(/no stored version history/i)
  })

  it('is machine-readable and self-describing, per Art. 20', () => {
    const result = buildPrivacyExport({ account, documents: [doc()], localSettings: {} })
    const round = JSON.parse(JSON.stringify(result))

    expect(round.format).toBe('cvapp-privacy-export')
    expect(round.formatVersion).toBe(1)
  })
})

describe('privacyExportFilename', () => {
  it('is dated', () => {
    expect(privacyExportFilename(new Date('2026-09-09T10:00:00Z'))).toBe(
      'CVApp_mine-data_2026-09-09.json',
    )
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test lib/privacy`
Expected: FAIL — cannot resolve `@/lib/privacy/export`.

- [ ] **Step 3: Implement it**

```ts
// lib/privacy/export.ts
import type { CvDocument } from '@/lib/schema/cv'

export type PrivacyExportAccount = {
  id: string
  email: string | null
  provider: string | null
}

export type PrivacyExport = {
  exportedAt: string
  format: 'cvapp-privacy-export'
  formatVersion: 1
  account: PrivacyExportAccount | null
  documents: CvDocument[]
  localSettings: Record<string, string>
  /** Categories CVApp does not hold, stated so the export is complete. */
  notes: string[]
}

/**
 * The GDPR Art. 15 export: everything CVApp holds about one person.
 *
 * Distinct from `serialiseBundle`, which is the Art. 20 portability format -
 * CVs only, shaped so they can be imported back. This one adds the account
 * record and the settings, and says out loud which categories are empty.
 */
export function buildPrivacyExport({
  account,
  documents,
  localSettings,
  now = new Date(),
}: {
  account: PrivacyExportAccount | null
  documents: CvDocument[]
  localSettings: Record<string, string>
  now?: Date
}): PrivacyExport {
  return {
    exportedAt: now.toISOString(),
    format: 'cvapp-privacy-export',
    formatVersion: 1,
    account,
    documents,
    localSettings,
    notes: [
      'CVApp keeps no usage data: no analytics, no tracking, no profiling.',
      'There is no stored version history. Undo lives in memory and is never saved.',
      'Photos are included inline in each document as data URIs; there are no separate uploaded files.',
      'Server logs held by the hosting provider may contain IP addresses. They contain no CV content.',
    ],
  }
}

export function privacyExportFilename(now: Date = new Date()): string {
  return `CVApp_mine-data_${now.toISOString().slice(0, 10)}.json`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test lib/privacy`
Expected: PASS, all six.

- [ ] **Step 5: Add the strings**

`messages/no.json`, in `auth`:

```json
    "downloadEverything": "Last ned alle data om meg",
    "downloadEverythingHint": "Alt CVApp har om deg, som JSON: kontoen din, alle CV-ene og innstillingene dine."
```

`messages/en.json`, same keys:

```json
    "downloadEverything": "Download everything about me",
    "downloadEverythingHint": "Everything CVApp holds about you, as JSON: your account, every CV, and your settings."
```

- [ ] **Step 6: Wire it into the account page**

In `components/auth/AccountPanel.tsx`, add a second button beside the
existing "Last ned alle CV-ene mine". Keep both: the CV bundle is the one
that imports back, and replacing it with the Art. 15 export would take away
a working feature.

```tsx
        <button
          className={buttonClass}
          disabled={!hydrated}
          onClick={() =>
            downloadJson(
              privacyExportFilename(),
              JSON.stringify(
                buildPrivacyExport({
                  account: { id: user.id, email: user.email, provider: user.provider },
                  documents,
                  localSettings: readLocalSettings(),
                }),
                null,
                2,
              ),
            )
          }
          type="button"
        >
          <FileJson aria-hidden="true" className="size-4" />
          {t('downloadEverything')}
        </button>
        <p className="text-xs text-muted-foreground">{t('downloadEverythingHint')}</p>
```

with, at the top of the file:

```tsx
import { STORAGE_PREFIX } from '@/lib/app-meta'
import { buildPrivacyExport, privacyExportFilename } from '@/lib/privacy/export'

/** The cvapp:* flags, which are data held on the user's behalf. */
function readLocalSettings(): Record<string, string> {
  const settings: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      // The documents themselves are exported separately and in full; this is
      // for the small preference flags only. Today that is
      // cvapp:export-hint-seen:v1, cvapp:beta-notice-seen:v1 and
      // cvapp:guest-export:v1.
      if (key?.startsWith(STORAGE_PREFIX) && !key.startsWith(`${STORAGE_PREFIX}documents`)) {
        settings[key] = localStorage.getItem(key) ?? ''
      }
    }
  } catch {
    // Private browsing can refuse storage entirely. An export missing the
    // preference flags is better than no export at all.
  }
  return settings
}
```

Add `FileJson` to the `lucide-react` import.

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib/privacy components/auth messages
git commit -m "feat(privacy): add a complete Art. 15 data export"
```

---

### Task 5: Tell users about the referee they are entering

**Files:**
- Modify: `components/editor/forms/ReferencesForm.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Create: `components/editor/__tests__/reference-notice.test.tsx`

**Interfaces:**
- Consumes: the existing references form component.

Spec §7 calls this "the obligation most CV products get wrong", and names the
minimum defensible approach. CVApp already satisfies two of its three parts —
it never contacts referees, and there is no public sharing. The missing part
is the notice at the point of entry.

- [ ] **Step 1: Read the form**

`components/editor/forms/ReferencesForm.tsx` renders Name, Role,
Organisation, Email and Phone per referee, and already takes a `hint` prop -
it passes `hint={t('onRequestHint')}` at line 33, explaining that an empty
section prints "Referanser oppgis ved forespørsel".

That hint is about formatting, not permission. The consent notice is a
second, separate line: merging them would bury an obligation inside a
layout tip.

- [ ] **Step 2: Add the strings**

`messages/no.json`, in `forms`:

```json
    "referenceConsent": "Spør referansen først. Du er ansvarlig for å ha lov til å dele kontaktopplysningene deres."
```

`messages/en.json`:

```json
    "referenceConsent": "Ask your referee first. You are responsible for having their permission to share their contact details."
```

- [ ] **Step 3: Write the failing test**

```tsx
// components/editor/__tests__/reference-notice.test.tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'

import messages from '@/messages/no.json'
// Import the references form component found in Step 1.
import { ReferenceForm } from '@/components/editor/ReferenceForm'

describe('the references form', () => {
  it('tells the user they need the referee permission', () => {
    // A referee is a person who never visited CVApp and never agreed to
    // anything. This notice is the point-of-entry half of the spec's
    // Art. 14 position.
    render(
      <NextIntlClientProvider locale="no" messages={messages}>
        <ReferenceForm {...propsFromAnExistingReferenceFormTest} />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText(messages.forms.referenceConsent)).toBeInTheDocument()
  })
})
```

Copy the props object from the existing reference form test in
`components/editor/__tests__/entry-forms.test.tsx` rather than inventing one;
the component's prop shape is already exercised there.

- [ ] **Step 4: Run it and watch it fail**

Run: `bun run test components/editor/__tests__/reference-notice.test.tsx`
Expected: FAIL — the text is not in the document.

- [ ] **Step 5: Render the notice**

Add above the first field of the references form:

```tsx
      {/* The referee is a person who never visited CVApp. Spec §7: this
          notice plus never contacting them is the defensible position.
          Separate from the existing onRequestHint, which is about what an
          empty section prints. */}
      <p className="text-xs text-muted-foreground">{t('referenceConsent')}</p>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `bun run test components/editor`
Expected: PASS.

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add components/editor messages
git commit -m "feat(privacy): tell users they need their referee's permission"
```

---

### Task 6: The privacy policy and a footer to reach it from

**Files:**
- Create: `components/chrome/AppFooter.tsx`
- Create: `app/[locale]/personvern/page.tsx`
- Create: `app/[locale]/vilkar/page.tsx`
- Modify: `app/[locale]/layout.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Create: `e2e/legal.spec.ts`

**Interfaces:**
- Consumes: `Link` from `@/i18n/navigation`.
- Produces: routes `/[locale]/personvern` and `/[locale]/vilkar`, reachable
  from every page.

The route names stay Norwegian in both locales, because `routing` defines no
`pathnames` map — one URL per page, as the auth endpoints already assume.

- [ ] **Step 1: Write the policy content**

The policy must cover, per Art. 13 and spec §12: controller identity and
contact, purposes and legal basis, recipients, transfers outside the EEA,
retention, the full list of rights including complaint to Datatilsynet,
whether providing data is required, that there is no automated
decision-making, and AI processing (there is none).

Write it as a component so both languages share one structure and the
message catalogue holds the text. Keep the section ids stable — the policy
version is referenced from consent records if analytics is ever added.

Content that must be accurate for CVApp specifically, not boilerplate:

- **Controller:** the operator's name, organisation number and email. These
  are the operator's to supply — leave a clearly marked placeholder and open
  the PR asking for them, rather than inventing an org.nr.
- **Legal basis:** Art. 6(1)(b) for the CV and the account. No consent is
  collected, because nothing needs it.
- **Recipients:** Supabase and Vercel, with the regions from Task 0.
- **Transfers:** none outside the EEA, assuming Task 0 confirms EEA regions.
- **Retention:** as in the data inventory.
- **Rights:** all seven, with self-service where it exists — "Last ned alle
  data om meg" and "Slett kontoen min" on `/konto`.
- **No automated decision-making**, stated explicitly.
- **No AI processing**, stated explicitly.
- **Free-text fields:** users choose what to include and should avoid
  special-category data unless necessary (spec §3).
- **Referees:** covered per spec §7, with a contact route for a referee who
  wants their details removed.
- **localStorage:** used only for the CVs themselves and a few preference
  flags. This is strictly necessary to deliver the service the user asked
  for, so it is exempt under *ekomloven § 3-15* and there is no cookie
  banner. Say so — it is unusual enough that a reader will wonder.

- [ ] **Step 2: Write the footer**

```tsx
// components/chrome/AppFooter.tsx
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

export async function AppFooter() {
  const t = await getTranslations('footer')

  return (
    <footer className="mt-16 border-t border-border/70 bg-sand/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{t('tagline')}</p>
        <nav className="flex flex-wrap gap-4">
          <Link className="hover:text-brand-strong hover:underline" href="/personvern">
            {t('privacy')}
          </Link>
          <Link className="hover:text-brand-strong hover:underline" href="/vilkar">
            {t('terms')}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
```

Mount it in `app/[locale]/layout.tsx` after `{children}`, inside
`SessionProvider`.

- [ ] **Step 3: Write the e2e guard**

```ts
// e2e/legal.spec.ts
import { expect, test } from '@playwright/test'

/**
 * Art. 13 requires the policy to be provided, which in practice means
 * reachable. A policy that exists but is not linked is the same defect as no
 * policy, and is easy to introduce by changing a layout.
 */
for (const locale of ['no', 'en']) {
  test(`the privacy policy is reachable from the landing page in ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await page.getByRole('contentinfo').getByRole('link', { name: /Personvern|Privacy/ }).click()
    await expect(page).toHaveURL(new RegExp(`/${locale}/personvern`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test(`the policy names Datatilsynet as the supervisory authority in ${locale}`, async ({
    page,
  }) => {
    // Art. 13(2)(d): the right to lodge a complaint, and with whom.
    await page.goto(`/${locale}/personvern`)
    await expect(page.getByText(/Datatilsynet/)).toBeVisible()
  })

  test(`the policy does not cite the repealed ekomloven section in ${locale}`, async ({ page }) => {
    // § 2-7b was repealed on 1 January 2025 and replaced by § 3-15.
    await page.goto(`/${locale}/personvern`)
    await expect(page.getByText('2-7b')).toHaveCount(0)
  })
}

test('the editor still fits a phone with the footer added', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/no/personvern')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
```

- [ ] **Step 4: Run it**

Run: `bun run test:e2e e2e/legal.spec.ts`
Expected: PASS once the pages and footer exist.

- [ ] **Step 5: Add the review notice**

At the top of the policy source file:

```tsx
/**
 * This describes exactly what CVApp does, and is accurate as written. It has
 * not been reviewed by a lawyer. Spec §16 puts the final wording of the
 * policy and terms outside what a coding agent should settle; get a
 * Norwegian privacy review before CVApp charges money.
 */
```

- [ ] **Step 6: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
bun run test:e2e
git add components/chrome app/\[locale\] messages e2e
git commit -m "feat(privacy): publish the privacy policy, terms and a footer"
```

---

### Task 7: The processor list, checked against what the app talks to

**Files:**
- Create: `docs/privacy/processors.md`
- Create: `lib/privacy/processors.ts`
- Create: `lib/privacy/__tests__/processors.test.ts`

**Interfaces:**
- Produces: `PROCESSORS: readonly Processor[]` where
  `Processor = { name: string; purpose: string; country: string; hosts: string[] }`.

Spec §6 requires a public sub-processor list. The failure mode is that it
goes stale the moment a vendor is added — so the list is code, the privacy
policy renders it, and a test asserts no external host appears in the app
that is not on it.

- [ ] **Step 1: Write the failing test**

```ts
// lib/privacy/__tests__/processors.test.ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PROCESSORS } from '@/lib/privacy/processors'

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, found)
    else if (/\.(ts|tsx)$/.test(entry) && !path.includes('__tests__')) found.push(path)
  }
  return found
}

describe('the processor list', () => {
  it('covers every external host the app talks to', () => {
    // A vendor added without a DPA and a policy entry is exactly the
    // Art. 28 failure the list exists to prevent, and it is one import away.
    const declared = new Set(PROCESSORS.flatMap((processor) => processor.hosts))
    const allowed = [...declared, 'localhost', '127.0.0.1', 'example.com', 'example.no']

    const found = new Set<string>()
    for (const file of [...sourceFiles('lib'), ...sourceFiles('app'), ...sourceFiles('components')]) {
      for (const match of readFileSync(file, 'utf8').matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        const host = match[1]!.toLowerCase()
        if (!allowed.some((entry) => host === entry || host.endsWith(`.${entry}`))) {
          found.add(`${host} (${file})`)
        }
      }
    }

    expect([...found], `undeclared external hosts: ${[...found].join(', ')}`).toEqual([])
  })

  it('gives every processor a purpose and a country, which the policy must state', () => {
    for (const processor of PROCESSORS) {
      expect(processor.purpose.trim(), `${processor.name} has no purpose`).not.toBe('')
      expect(processor.country.trim(), `${processor.name} has no country`).not.toBe('')
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test lib/privacy/__tests__/processors.test.ts`
Expected: FAIL — cannot resolve `@/lib/privacy/processors`.

- [ ] **Step 3: Implement the list**

```ts
// lib/privacy/processors.ts
export type Processor = {
  name: string
  purpose: string
  /** Where the processing happens. Confirm in each vendor's dashboard. */
  country: string
  /** Hostnames the application contacts, for the drift test. */
  hosts: string[]
}

/**
 * Every processor handling personal data on the operator's behalf, per
 * GDPR Art. 28 and spec §6. Rendered in the privacy policy, and enforced by
 * a test that fails when the app talks to a host that is not listed here.
 *
 * Adding an entry is not the whole job: a DPA has to be accepted and archived
 * first. See docs/privacy/processors.md.
 */
export const PROCESSORS: readonly Processor[] = [
  {
    name: 'Supabase',
    purpose: 'Authentication and storage of CVs for signed-in users',
    country: 'REPLACE WITH THE REGION CONFIRMED IN TASK 0',
    hosts: ['supabase.co', 'supabase.com'],
  },
  {
    name: 'Vercel',
    purpose: 'Application hosting and delivery; server logs containing IP addresses',
    country: 'REPLACE WITH THE REGION CONFIRMED IN TASK 0',
    hosts: ['vercel.app', 'vercel.com'],
  },
] as const
```

The `REPLACE WITH` markers are deliberate: the plan cannot know the answer,
and a guessed region in a published policy is worse than an obvious blank.
Task 0 supplies both. Do not commit this task until they are filled in.

- [ ] **Step 4: Write the operational document**

`docs/privacy/processors.md` records, per processor: the DPA acceptance date,
where the PDF is archived, the region, and the notification process for
adding a new one (a changelog entry plus a policy `lastUpdated` bump, which
spec §6 calls proportionate for a small consumer service).

- [ ] **Step 5: Render the list in the policy**

The privacy policy page maps over `PROCESSORS` rather than repeating them, so
the published list and the tested list cannot disagree.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun run test lib/privacy`
Expected: PASS. If the host scan reports something unexpected, that is a real
finding — a vendor reached for without a DPA.

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib/privacy docs/privacy
git commit -m "feat(privacy): declare processors, enforced against the source"
```

---

### Task 8: Logging and analytics hygiene

**Files:**
- Create: `lib/privacy/__tests__/no-tracking.test.ts`
- Modify: any file the test finds

**Interfaces:**
- No runtime interface. This task makes two of the spec's guarantees
  enforceable rather than aspirational.

Spec §10: "do **not** log CV content, full request bodies, or auth tokens".
Spec §9: the cookieless path is only the simplest path for as long as nobody
adds a tracker.

- [ ] **Step 1: Write the test**

```ts
// lib/privacy/__tests__/no-tracking.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import packageJson from '../../../package.json'

const TRACKING_PACKAGES = [
  '@vercel/analytics',
  '@vercel/speed-insights',
  'posthog-js',
  '@sentry/nextjs',
  '@sentry/react',
  'mixpanel-browser',
  'react-ga',
  'react-ga4',
  '@amplitude/analytics-browser',
]

describe('privacy posture', () => {
  it('ships no analytics or error-tracking dependency', () => {
    // Not a style preference. With no non-essential storage, CVApp needs no
    // consent banner under ekomloven § 3-15. Adding any of these changes the
    // legal position and requires a consent manager with equal-prominence
    // reject - so it must be a deliberate decision, not an npm install.
    const installed = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    } as Record<string, string>

    const present = TRACKING_PACKAGES.filter((name) => name in installed)
    expect(present, `tracking dependency added: ${present.join(', ')}`).toEqual([])
  })

  it('does not log CV documents or personal data', () => {
    // Spec §10. A console.log of a document object ends up in the hosting
    // provider's server logs, which is CV content in a place the data
    // inventory does not account for.
    const files = ['lib', 'components', 'app']
    const offenders: string[] = []

    for (const dir of files) {
      for (const file of sourceFiles(dir)) {
        const source = readFileSync(file, 'utf8')
        for (const [index, line] of source.split('\n').entries()) {
          if (!/console\.(log|info|debug|warn|error)/.test(line)) continue
          if (/\b(document|doc|personalia|cv|user|session|token|body)\b/.test(line)) {
            offenders.push(`${file}:${index + 1}  ${line.trim()}`)
          }
        }
      }
    }

    expect(offenders, `possible personal data in logs:\n${offenders.join('\n')}`).toEqual([])
  })
})
```

Reuse the `sourceFiles` helper from Task 7 by exporting it from a shared test
helper, `lib/privacy/__tests__/source-files.ts`, and importing it in both.

- [ ] **Step 2: Run it and fix what it finds**

Run: `bun run test lib/privacy/__tests__/no-tracking.test.ts`

There is one known hit: `lib/sync/engine.ts` logs `console.warn('[sync]
failed, will retry', error)`. A Supabase error object can carry request
detail. Narrow it to the message alone:

```ts
        console.warn('[sync] failed, will retry:', error instanceof Error ? error.message : 'unknown')
```

Any other hit is a real finding. Fix rather than widen the pattern; if a hit
is genuinely a false positive, rename the local variable rather than adding
an exception, so the rule stays simple.

- [ ] **Step 3: Guard the EXIF stripping**

Photos already lose their EXIF, including GPS coordinates, because
`lib/image/compress.ts:72` re-encodes through a Canvas and returns
`canvas.toDataURL('image/jpeg', PHOTO_QUALITY)` - the original bytes are
never stored. That is a privacy guarantee reached by accident of the
compression, so it needs a test saying it is deliberate: someone optimising
"skip re-encoding when the image is already small enough" would silently
start storing camera originals with home coordinates in them.

Add to `lib/image/__tests__/compress.test.ts`:

```ts
it('never stores the original file bytes, which carry EXIF GPS', async () => {
  // The output is always a fresh Canvas encode. A future fast path that
  // returns the input untouched would put the photographer's home
  // coordinates into every exported CV.
  const source = 'data:image/jpeg;base64,SHOULD-NOT-SURVIVE'
  const result = await compress(fileFrom(source), fakeDeps())

  expect(result).toMatch(/^data:image\/jpeg;base64,/)
  expect(result).not.toContain('SHOULD-NOT-SURVIVE')
})
```

Use the existing fixtures in that file for `fileFrom` and the injected
`deps`; the module already takes a `createCanvas` seam for exactly this.

- [ ] **Step 4: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib
git commit -m "test(privacy): keep trackers out, logs clean and EXIF stripped"
```

---

### Task 9: Security response headers

**Files:**
- Modify: `next.config.ts`
- Create: `e2e/headers.spec.ts`

**Interfaces:**
- Produces: the response headers listed in spec §10.

Content-Security-Policy is **not** in this task. It is Task 10, on its own,
because it can break the export silently.

- [ ] **Step 1: Add the headers**

```ts
// next.config.ts
const nextConfig: NextConfig = {
  // Spec §10. HSTS is set by Vercel on its domains, but stating it here
  // keeps the app correct on any host.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            // The app asks for none of these. Denying them limits what an
            // injected script could reach for.
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // The CV is never meant to be framed by another site.
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}
```

- [ ] **Step 2: Write the e2e guard**

```ts
// e2e/headers.spec.ts
import { expect, test } from '@playwright/test'

test('security headers are set on every response', async ({ request }) => {
  const response = await request.get('/no')
  const headers = response.headers()

  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['strict-transport-security']).toContain('max-age=')
  expect(headers['x-frame-options']).toBe('DENY')
})
```

- [ ] **Step 3: Verify the export still works**

`X-Frame-Options: DENY` governs *being framed*, not framing — the print
iframe is same-document and unaffected. Confirm rather than assume:

```bash
bun run test:e2e e2e/export.spec.ts e2e/headers.spec.ts
```

Expected: PASS, including the PDF font-embedding test.

- [ ] **Step 4: Commit**

```bash
bun run test
bun run typecheck
bun run lint
git add next.config.ts e2e
git commit -m "feat(security): set the response headers from the spec"
```

---

### Task 10: Content-Security-Policy, carefully

**Files:**
- Modify: `next.config.ts`
- Create: `e2e/csp.spec.ts`

A naive strict CSP breaks this app in two specific ways, both silent. Read
both before writing a directive.

**1. The CV's theme tokens are inline style attributes.**
`components/cv/CvDocument.tsx:69` renders `style={style}`, which emits a
`style=""` attribute carrying every `--cv-*` custom property. CSP's
`style-src` governs attributes as well as `<style>` blocks, and a nonce
cannot whitelist an attribute. `style-src 'self'` alone removes every colour,
font and page dimension from every CV — on screen and in the PDF.

**2. The export is a `srcdoc` iframe.** `lib/print/print-cv.ts:72` sets
`iframe.srcdoc`. A `srcdoc` document inherits the embedding page's CSP, so
whatever blocks the app blocks the export too, and the failure appears as a
blank or unstyled PDF rather than an error.

The directive set below is deliberately not the strictest possible one. It is
the strictest one that leaves the product working.

- [ ] **Step 1: Add the policy**

```ts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              // Photos are stored inline as data: URIs, and the print iframe
              // renders them the same way.
              "img-src 'self' data: blob:",
              "font-src 'self'",
              // Supabase auth and REST. Sign-in also navigates to the
              // provider, which form-action/default-src do not cover.
              "connect-src 'self' https://*.supabase.co",
              // style-src-attr is the load-bearing part: the CV's --cv-*
              // tokens are inline style attributes, and no nonce can cover an
              // attribute. Without it every CV renders unstyled.
              "style-src 'self' 'unsafe-inline'",
              "style-src-attr 'unsafe-inline'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
```

`script-src` is deliberately absent, so it falls back to `default-src 'self'`.
Next's framework bootstrap uses inline scripts; adding a nonce for them means
opting every page into dynamic rendering, which costs the static optimisation
the landing page and gallery currently get. That trade is a separate
decision, and this plan does not silently make it. Record it as an open item
in `docs/privacy/README.md`.

> If `default-src 'self'` blocks Next's inline bootstrap in production,
> the symptom is a page that renders but never hydrates. Check the browser
> console for a CSP violation naming `script-src`, and if so, take the nonce
> route from `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`
> as its own task rather than reaching for `'unsafe-inline'` on scripts.

- [ ] **Step 2: Write the guard that matters**

```ts
// e2e/csp.spec.ts
import { expect, test } from '@playwright/test'

test('the CSP is set', async ({ request }) => {
  const response = await request.get('/no')
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'")
})

test('the CSP does not strip the CV of its styling', async ({ page }) => {
  // The regression this exists for: style-src without style-src-attr removes
  // every --cv-* token, and the CV renders as unstyled text in the preview
  // and in the exported PDF alike.
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text())
  })

  await page.goto('/no/preview')
  await page.evaluate(() => document.fonts.ready)

  const accent = await page.evaluate(() => {
    const doc = document.querySelector('.cv-doc') as HTMLElement
    return getComputedStyle(doc).getPropertyValue('--cv-accent').trim()
  })

  expect(accent).not.toBe('')
  expect(violations, `CSP violations:\n${violations.join('\n')}`).toEqual([])
})

test('the page hydrates under the CSP', async ({ page }) => {
  // A blocked framework bootstrap renders fine and does nothing. Clicking is
  // the only way to tell the difference.
  await page.goto('/no/templates')
  await page.locator('button:has(.cv-doc--oslo)').click()
  await expect(page).toHaveURL(/\/no\/cv\/.+/)
})
```

- [ ] **Step 3: Run the whole suite, not just the new tests**

```bash
bun run test:e2e
```

Expected: all pass, including `e2e/export.spec.ts`. The export tests are the
ones that would catch a CSP that breaks the PDF.

- [ ] **Step 4: Check it in a real browser too**

```bash
bun run build && bunx next start --port 3001
```

Open `http://localhost:3001/no/cv`, create a CV, and download it. Confirm the
PDF has fonts and colour. Check the console for CSP violations. The e2e
suite runs the export through `page.pdf`, which does not exercise the browser
print path the user actually takes.

- [ ] **Step 5: Commit**

```bash
bun run test
bun run typecheck
bun run lint
bun run test:e2e
git add next.config.ts e2e
git commit -m "feat(security): add a CSP that does not break the CV or the export"
```

---

### Task 11: Rate limiting on the sensitive endpoints

**Files:**
- Create: `lib/security/rate-limit.ts`
- Create: `lib/security/__tests__/rate-limit.test.ts`
- Modify: `app/auth/sign-out/route.ts`, `app/auth/delete-account/route.ts`, `app/api/keep-alive/route.ts`

**Interfaces:**
- Produces:
  ```ts
  function rateLimit(key: string, options?: { limit?: number; windowMs?: number; now?: () => number }): { ok: boolean; retryAfterMs: number }
  ```

Spec §10 requires rate limiting on auth and on the export/delete endpoints.

**Be honest about what this is.** An in-memory limiter on serverless
functions is per-instance, so it is a speed bump rather than a guarantee. It
is still worth having — it stops a naive loop against account deletion — and
it is the right shape to swap for a shared store later. Do not describe it in
the policy or the ROPA as more than it is.

- [ ] **Step 1: Write the failing test**

```ts
// lib/security/__tests__/rate-limit.test.ts
import { beforeEach, describe, expect, it } from 'vitest'

import { rateLimit, resetRateLimits } from '@/lib/security/rate-limit'

beforeEach(() => resetRateLimits())

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    let now = 0
    const options = { limit: 3, windowMs: 1000, now: () => now }
    expect(rateLimit('a', options).ok).toBe(true)
    expect(rateLimit('a', options).ok).toBe(true)
    expect(rateLimit('a', options).ok).toBe(true)
  })

  it('refuses the one after, and says how long to wait', () => {
    let now = 0
    const options = { limit: 1, windowMs: 1000, now: () => now }
    rateLimit('a', options)
    const second = rateLimit('a', options)

    expect(second.ok).toBe(false)
    expect(second.retryAfterMs).toBeGreaterThan(0)
  })

  it('forgets the window once it has passed', () => {
    let now = 0
    const options = { limit: 1, windowMs: 1000, now: () => now }
    rateLimit('a', options)
    now = 1001
    expect(rateLimit('a', options).ok).toBe(true)
  })

  it('counts each key separately, so one user cannot lock out another', () => {
    const options = { limit: 1, windowMs: 1000, now: () => 0 }
    rateLimit('a', options)
    expect(rateLimit('b', options).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test lib/security`
Expected: FAIL.

- [ ] **Step 3: Implement it**

```ts
// lib/security/rate-limit.ts
type Window = { count: number; startedAt: number }

const windows = new Map<string, Window>()

export const DEFAULT_LIMIT = 10
export const DEFAULT_WINDOW_MS = 60_000

/**
 * A fixed-window counter, held in memory.
 *
 * On serverless this is per-instance, so it is a speed bump rather than a
 * guarantee: a distributed attacker spread across instances gets more through
 * than the limit suggests. It still stops the realistic case - a loop against
 * account deletion or sign-out from one client - and swapping the Map for a
 * shared store later needs no change at the call sites.
 */
export function rateLimit(
  key: string,
  {
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
    now = () => Date.now(),
  }: { limit?: number; windowMs?: number; now?: () => number } = {},
): { ok: boolean; retryAfterMs: number } {
  const current = now()
  const existing = windows.get(key)

  if (!existing || current - existing.startedAt >= windowMs) {
    windows.set(key, { count: 1, startedAt: current })
    return { ok: true, retryAfterMs: 0 }
  }

  existing.count += 1
  if (existing.count > limit) {
    return { ok: false, retryAfterMs: existing.startedAt + windowMs - current }
  }
  return { ok: true, retryAfterMs: 0 }
}

/** Test seam. Never called in production. */
export function resetRateLimits(): void {
  windows.clear()
}
```

- [ ] **Step 4: Apply it to the route handlers**

In each of the three routes, before any other work:

```ts
import { rateLimit } from '@/lib/security/rate-limit'

  // The forwarded address is the closest thing to a caller identity before a
  // session is established. It is not logged, only counted.
  const caller = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = rateLimit(`delete-account:${caller}`, { limit: 5, windowMs: 60_000 })
  if (!limited.ok) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
    })
  }
```

Use a distinct key prefix per route (`sign-out:`, `delete-account:`,
`keep-alive:`) so one does not exhaust another's budget.

- [ ] **Step 4b: Close the keep-alive endpoint's fail-open**

`app/api/keep-alive/route.ts:19-22` only checks `CRON_SECRET` when it is set:

```ts
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
```

With the variable unset - which is its state until someone remembers to add
it on Vercel - the endpoint is an unauthenticated trigger for a database
query, reachable by anyone who finds the URL. Fail closed in production
instead:

```ts
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Unset is fine locally, where the endpoint is a convenience. In
    // production it means an open trigger for a database query, so refuse
    // rather than run: a cron that 503s is visible, a public endpoint is not.
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Not configured', { status: 503 })
    }
  } else if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
```

Then set `CRON_SECRET` in the Vercel project's production environment, and
confirm the next daily run succeeds rather than 503s.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test lib/security`
Expected: PASS.

- [ ] **Step 6: Confirm the routes still work**

```bash
bun run dev
curl -s -o /dev/null -w "%{http_code}\n" -X POST -d "next=/no/cv" http://localhost:3001/auth/sign-out
```

Expected: `303`. Then run the same command seven times in a row and confirm
the later ones return `429`.

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
bun run test:e2e
git add lib/security app/auth app/api
git commit -m "feat(security): rate-limit the auth and account endpoints"
```

---

### Task 12: Close out the checklist

**Files:**
- Create: `docs/privacy/launch-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Write the checklist with its evidence**

Reproduce the spec's §15 blocking list, and against each item name the
artefact that proves it — a test path, a file, or a dated console action.
An unticked item with no evidence is the honest state; a ticked one with no
evidence is worse than useless.

- [ ] **Step 2: Update the README**

Add a Privacy section: where the documents live, that the data inventory and
processor list are test-enforced, that there is no analytics by design and
therefore no cookie banner, and that the privacy policy needs legal review
before charging money.

- [ ] **Step 3: Full verification**

```bash
bun run test
bun run typecheck
bun run lint
bun run build
bun run test:e2e
```

- [ ] **Step 4: Finish the branch**

Use `superpowers:finishing-a-development-branch`.

---

## Self-review against the spec

Sections covered by a task: §2 (Task 2), §4 access and portability (Task 4),
§4 rectification (already satisfied), §5 deletion (Task 3), §6 processors and
transfers (Tasks 0, 7), §7 referees (Task 5), §9 cookies (Task 8 keeps the
exemption true), §10 security (Tasks 8, 9, 10, 11 — the rest already
satisfied, see the table at the top), §11 privacy by design (Task 2 enforces
the field floor), §12 documents 1-3 (Tasks 6, 7).

Deliberately deferred to Plan 6, each named in "What this plan does not
cover": §4 restriction and objection, §5 retention jobs and backup
reconciliation, §12 items 4-8 (ROPA, LIA, breach plan, DPIA screening, DPO
assessment), §13 breach handling.

Not applicable to the current product, each stated with why: §3 and §8 (no
AI), §3 and §5 billing (no payments), §9 consent manager (no non-essential
storage).

Requires a person, not an agent: §16 in full, plus the controller identity in
Task 6 and the regions in Task 0.
