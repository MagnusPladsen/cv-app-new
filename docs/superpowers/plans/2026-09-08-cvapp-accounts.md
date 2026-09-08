# CVApp Accounts, OAuth and Sync Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people sign in with Google or Apple, keep their CVs on their account across devices, and carry every CV they already built anonymously into that account the first time they sign in — without taking the anonymous, offline, no-account flow away from anyone.

**Architecture:** Local-first with background sync. The Zustand store stays the source of truth the editor reads and writes, so typing is instant and the app still works offline and signed out. When a session exists, a sync engine reconciles the local store against a `cv_documents` table in Supabase using last-write-wins on the `updatedAt` the editor already stamps, with tombstones so a delete on one device is not resurrected by a stale copy on another. Auth is Supabase Auth over cookies (`@supabase/ssr`), which means the existing next-intl proxy has to hand its response to Supabase's cookie writer rather than being replaced by it.

**Tech Stack:** As Plans 1-3. New: `@supabase/supabase-js`, `@supabase/ssr`, and a Supabase project on the free tier. No new client state library — sync status is a small Zustand store beside the documents store.

**Spec:** `docs/superpowers/specs/2026-09-02-cvapp-design.md` (accounts were named as post-beta there; this plan is the design for them)
**Predecessors:** Plans 1-3, all complete.

## Global Constraints

Plans 1-3's Global Constraints still apply in full. The load-bearing ones here:

- **Package manager is Bun.** Never `npm` or `yarn`.
- **Label parity** between `messages/no.json` and `messages/en.json` is
  test-enforced. Every new string goes in both.
- **Schema changes require a migration and a test.** This now means two
  schemas: the `CvDocument` zod schema *and* the persisted store shape.
- **Verification runs unpiped.** `bun run test`, `bun run typecheck`,
  `bun run lint` as bare commands, so a non-zero exit is not swallowed.
- **Port 3001** for `bun run dev`.
- **No CI.** Vercel builds on push; verification is local and manual.

New constraints for this plan, all of them load-bearing:

- **The app must work with no Supabase configuration at all.** If
  `NEXT_PUBLIC_SUPABASE_URL` is unset, every auth affordance disappears and
  the rest of CVApp behaves exactly as it does today. This is not a nicety:
  local dev, the e2e suite, and any fork all run without credentials. Every
  task that touches Supabase must keep this true, and Task 12 tests it.
- **Never ship a service-role key.** Only `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` exist in this app. Anything that
  would need the service role must instead be a `security definer` Postgres
  function reachable by an authenticated user. If a task seems to need the
  service key, stop and ask.
- **Row Level Security on from the first migration.** A table without RLS in
  Supabase is a public table. Enable it in the same migration that creates
  the table, never in a follow-up.
- **Signing out must not leak the previous user's CVs to the next person on
  that browser.** Task 3 encodes this in the store; do not weaken it for
  convenience.
- **The store is the source of truth while editing.** No editor component
  gains an `await`. Nothing in `components/editor/**` or `components/cv/**`
  imports from `lib/supabase/**`.

---

### Task 0: Provision Supabase and the OAuth providers (manual, blocking)

This task is done by a human in three web consoles. Nothing later works
without it, but Tasks 1, 3, 4 and 5 can be written and unit-tested before it
finishes — only Tasks 2, 7 and the manual verification actually need a live
project.

- [ ] **Step 1: Create the Supabase project**

At <https://supabase.com/dashboard>, create a free-tier project in the EU
(Frankfurt or Stockholm) — the users are Norwegian and the data is personal
data under GDPR, so it should not sit in `us-east-1`.

From Project Settings -> API, copy:
- Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
- the **publishable** key (`sb_publishable_...`, previously called the anon
  key) -> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not copy the secret/service-role key anywhere. It is not used by this app.

- [ ] **Step 2: Set the redirect allowlist**

Authentication -> URL Configuration:
- Site URL: the production domain (e.g. `https://cvapp.no`)
- Redirect URLs: add `http://localhost:3001/auth/callback`,
  `https://<production-domain>/auth/callback`, and the Vercel preview
  wildcard `https://cv-app-new-*.vercel.app/auth/callback`.

Sign-in silently fails with a redirect error if the exact callback URL is
not on this list, so add all three now.

- [ ] **Step 3: Enable Google**

Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client
ID -> Web application. Authorized redirect URI is Supabase's, not ours:
`https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and
secret into Supabase -> Authentication -> Providers -> Google, and enable it.

- [ ] **Step 4: Enable Apple (or defer it)**

Sign in with Apple requires membership of the Apple Developer Program
(currently ~USD 99/year). If that is not in place, **skip this step**: Task 8
derives the buttons from what is configured, so the app ships with Google
alone and gains Apple the day it is enabled, with no code change.

If it is in place: developer.apple.com -> Certificates, Identifiers &
Profiles. Create an App ID, then a Services ID whose Return URL is
`https://<project-ref>.supabase.co/auth/v1/callback`, then a Sign in with
Apple key (`.p8`). Supabase -> Authentication -> Providers -> Apple takes the
Services ID as the client ID and a client secret generated from the key.

Note for whoever tests it: Apple refuses `http://localhost` return URLs.
Apple sign-in can only be exercised on the deployed HTTPS domain, so plan to
verify it on a Vercel preview rather than locally.

- [ ] **Step 5: Set the environment variables**

Locally in `.env.local` (already gitignored — confirm with
`git check-ignore -v .env.local` before writing anything into it), and on
Vercel for Production, Preview and Development:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- [ ] **Step 6: Record the providers you actually enabled**

Tell the executor of Task 8 which of Google/Apple are live. That list drives
`NEXT_PUBLIC_AUTH_PROVIDERS` in Step 5 of Task 1.

---

### Task 1: Supabase clients that degrade to nothing

**Files:**
- Create: `lib/supabase/env.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/__tests__/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces:
  - `type SupabaseEnv = { url: string; publishableKey: string }`
  - `readSupabaseEnv(source?: Record<string, string | undefined>): SupabaseEnv | null`
  - `isSupabaseConfigured(source?): boolean`
  - `enabledProviders(source?): OAuthProvider[]` where `type OAuthProvider = 'google' | 'apple'`
  - `getBrowserSupabase(): SupabaseClient | null` (memoised singleton)
  - `getServerSupabase(): Promise<SupabaseClient | null>` (per-request, reads `cookies()`)

- [ ] **Step 1: Install the packages**

```bash
bun add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Write the failing env test**

```ts
// lib/supabase/__tests__/env.test.ts
import { describe, expect, it } from 'vitest'
import { enabledProviders, isSupabaseConfigured, readSupabaseEnv } from '@/lib/supabase/env'

const full = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://ref.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
}

describe('readSupabaseEnv', () => {
  it('returns null when nothing is configured', () => {
    expect(readSupabaseEnv({})).toBeNull()
    expect(isSupabaseConfigured({})).toBe(false)
  })

  it('returns null when only half the pair is present', () => {
    expect(readSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: full.NEXT_PUBLIC_SUPABASE_URL })).toBeNull()
  })

  it('reads a complete pair', () => {
    expect(readSupabaseEnv(full)).toEqual({
      url: 'https://ref.supabase.co',
      publishableKey: 'sb_publishable_abc',
    })
  })

  it('treats a blank string as unset, because Vercel writes empty vars', () => {
    expect(readSupabaseEnv({ ...full, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '  ' })).toBeNull()
  })
})

describe('enabledProviders', () => {
  it('offers no providers when Supabase is unconfigured', () => {
    expect(enabledProviders({ NEXT_PUBLIC_AUTH_PROVIDERS: 'google,apple' })).toEqual([])
  })

  it('defaults to Google alone, since Apple needs a paid developer account', () => {
    expect(enabledProviders(full)).toEqual(['google'])
  })

  it('reads an explicit list, ignoring unknown names and whitespace', () => {
    const source = { ...full, NEXT_PUBLIC_AUTH_PROVIDERS: ' apple , google , github ' }
    expect(enabledProviders(source)).toEqual(['apple', 'google'])
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `bun run test lib/supabase`
Expected: FAIL, cannot resolve `@/lib/supabase/env`.

- [ ] **Step 4: Implement the env reader**

```ts
// lib/supabase/env.ts
export type OAuthProvider = 'google' | 'apple'

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['google', 'apple']

export type SupabaseEnv = { url: string; publishableKey: string }

/**
 * Next inlines NEXT_PUBLIC_* at build time only where it can see the literal
 * property access, so these two reads must stay written out in full. Do not
 * refactor them into a loop over a list of names: the values come back
 * undefined in the browser bundle if you do.
 */
function defaultSource(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_AUTH_PROVIDERS: process.env.NEXT_PUBLIC_AUTH_PROVIDERS,
  }
}

function trimmed(value: string | undefined): string | null {
  const result = value?.trim()
  return result ? result : null
}

export function readSupabaseEnv(source = defaultSource()): SupabaseEnv | null {
  const url = trimmed(source.NEXT_PUBLIC_SUPABASE_URL)
  const publishableKey = trimmed(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}

export function isSupabaseConfigured(source = defaultSource()): boolean {
  return readSupabaseEnv(source) !== null
}

/**
 * Apple is off unless asked for: it needs a paid Apple Developer account, and
 * a button that always errors is worse than no button.
 */
export function enabledProviders(source = defaultSource()): OAuthProvider[] {
  if (!readSupabaseEnv(source)) return []
  const raw = trimmed(source.NEXT_PUBLIC_AUTH_PROVIDERS)
  if (!raw) return ['google']
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter((name): name is OAuthProvider => OAUTH_PROVIDERS.includes(name as OAuthProvider))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test lib/supabase`
Expected: PASS.

- [ ] **Step 6: Write the browser client**

```ts
// lib/supabase/client.ts
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseEnv } from './env'

let cached: SupabaseClient | null = null

/**
 * Returns null when Supabase is unconfigured, which is the signed-out,
 * local-only mode the whole app has to keep working in. Callers branch on
 * null rather than throwing.
 *
 * The client is memoised: a second instance would open a second auth channel
 * and the two would fight over refreshing the same cookie.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (cached) return cached
  const env = readSupabaseEnv()
  if (!env) return null
  cached = createBrowserClient(env.url, env.publishableKey)
  return cached
}
```

- [ ] **Step 7: Write the server client**

```ts
// lib/supabase/server.ts
import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { readSupabaseEnv } from './env'

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const env = readSupabaseEnv()
  if (!env) return null

  const cookieStore = await cookies()

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies. Ignored on purpose: the
          // proxy (Task 7) refreshes the session on every request, so a
          // dropped write here costs nothing.
        }
      },
    },
  })
}
```

- [ ] **Step 8: Document the variables**

Append to `.env.example`:

```
# Supabase (optional). With these unset, CVApp runs exactly as it does in
# beta: everything local, no accounts, no sync.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Comma-separated. Defaults to "google". Add "apple" once Sign in with Apple
# is configured in the Supabase dashboard.
NEXT_PUBLIC_AUTH_PROVIDERS=google
```

- [ ] **Step 9: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib/supabase .env.example package.json bun.lock
git commit -m "feat(auth): add Supabase clients that no-op when unconfigured"
```

---

### Task 2: The `cv_documents` table, with RLS on from the start

**Files:**
- Create: `supabase/migrations/20260908000001_cv_documents.sql`
- Create: `supabase/README.md`
- Create: `app/api/keep-alive/route.ts`
- Create: `vercel.json`

**Interfaces:**
- Produces the table every later task reads and writes. Column names are the
  contract for Task 5: `id`, `user_id`, `name`, `doc`, `updated_at`,
  `deleted_at`, `synced_at`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260908000001_cv_documents.sql
create table if not exists public.cv_documents (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Denormalised from doc->>'name' so the account page can list CVs without
  -- pulling every payload.
  name text not null default '',

  -- The whole CvDocument, exactly as the zod schema serialises it. The client
  -- owns the shape; Postgres only stores it. Schema migrations therefore keep
  -- happening in lib/schema/migrations.ts on read, never here.
  doc jsonb not null,

  -- The editor's own clock, in ms, mirroring CvDocument.updatedAt. It is
  -- deliberately NOT now(): last-write-wins has to compare the same clock the
  -- editor stamps, or a fresh local edit looks older than the row it should
  -- replace. The cost is that a badly skewed device clock can lose an edit;
  -- for one person's own CVs that trade is worth it, and synced_at below
  -- keeps a truthful server-side record either way.
  updated_at bigint not null,

  -- Tombstone. Non-null means deleted; the row stays so other devices learn
  -- about the delete instead of resurrecting their stale copy.
  deleted_at bigint,

  synced_at timestamptz not null default now(),

  -- A CV with a photo is a megabyte or so of base64. Four is generous and
  -- still stops one account from eating the free tier's 500 MB.
  constraint cv_documents_doc_size check (pg_column_size(doc) < 4194304)
);

create index if not exists cv_documents_user_updated_idx
  on public.cv_documents (user_id, updated_at desc);

alter table public.cv_documents enable row level security;

create policy "Users read their own CVs"
  on public.cv_documents for select
  using ((select auth.uid()) = user_id);

create policy "Users insert their own CVs"
  on public.cv_documents for insert
  with check ((select auth.uid()) = user_id);

create policy "Users update their own CVs"
  on public.cv_documents for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own CVs"
  on public.cv_documents for delete
  using ((select auth.uid()) = user_id);

-- Keep a server-side timestamp the client cannot forge, for support and for
-- spotting clock-skew problems later.
create or replace function public.touch_synced_at()
returns trigger
language plpgsql
as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

create trigger cv_documents_touch_synced_at
  before insert or update on public.cv_documents
  for each row execute function public.touch_synced_at();
```

- [ ] **Step 2: Apply it**

For the beta, paste the file into the Supabase dashboard SQL editor and run
it. The file in the repo stays the source of truth so the schema is
reviewable in git and reproducible if the project is ever recreated.

Once the Supabase CLI is set up (`bunx supabase link --project-ref <ref>`),
`bunx supabase db push` applies it instead. Do not adopt the CLI as part of
this plan; it is a separate decision.

- [ ] **Step 3: Prove RLS actually holds**

In the SQL editor, as a second signed-in user would see it:

```sql
-- Should return 0 rows for a user who owns nothing, never an error and never
-- somebody else's CV.
select count(*) from public.cv_documents;
```

Then, in the dashboard's Table Editor, confirm the "RLS enabled" badge is on
`cv_documents`. A table without it is world-readable with the publishable
key, which is the single most expensive mistake available here.

- [ ] **Step 4: Write the operational note**

```markdown
<!-- supabase/README.md -->
# Supabase

Migrations here are the source of truth for the CVApp database schema. Apply
them in order through the dashboard SQL editor (or `bunx supabase db push`
once the CLI is linked).

- Region: EU. The rows are personal data.
- Keys: only the publishable key ever reaches the app. There is no
  service-role key in this codebase, and adding one needs a deliberate
  decision, not a convenient import.
- RLS is on for every table. A Supabase table without RLS is public.
- A daily Vercel cron hits `/api/keep-alive` so the free project is never
  paused for inactivity. If sign-in starts failing across the board, check
  the project is not paused before debugging anything else.
```

- [ ] **Step 5: Keep the free project awake**

Supabase pauses a free project after roughly a week with no requests at all.
A launched product never goes idle, but the gap between shipping this and
having users does, and a paused project makes every sign-in fail until
somebody clicks restore in the dashboard. One request a day removes the
question.

```ts
// app/api/keep-alive/route.ts
import { NextResponse } from 'next/server'

import { readSupabaseEnv } from '@/lib/supabase/env'

// Vercel Hobby allows one cron run per day, which is well inside Supabase's
// inactivity window.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Vercel signs cron requests with CRON_SECRET when it is set. Without this
  // check the endpoint is a free anonymous query against your database for
  // anyone who finds the URL.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const env = readSupabaseEnv()
  if (!env) return NextResponse.json({ ok: true, skipped: 'unconfigured' })

  // Any authenticated-or-not REST call counts as activity. RLS returns zero
  // rows to an anonymous caller, which is exactly what we want: proof of
  // life, no data.
  const response = await fetch(`${env.url}/rest/v1/cv_documents?select=id&limit=1`, {
    headers: { apikey: env.publishableKey, Authorization: `Bearer ${env.publishableKey}` },
    cache: 'no-store',
  })

  return NextResponse.json({ ok: response.ok, status: response.status })
}
```

```json
// vercel.json — merge into the existing file if there is one
{
  "crons": [{ "path": "/api/keep-alive", "schedule": "0 6 * * *" }]
}
```

Then set `CRON_SECRET` to a random string in the Vercel project's environment
variables (Production only — cron does not run on previews).

Two things to know about this endpoint: it lives under `/api`, which the
proxy matcher already excludes, so it is never locale-rewritten; and it
returns `skipped: unconfigured` rather than failing when Supabase is unset,
so a fork with no credentials does not get a red cron every morning.

Verify it locally:

```bash
curl -s http://localhost:3001/api/keep-alive
# {"ok":true,"status":200}
```

- [ ] **Step 6: Commit**

```bash
git add supabase app/api/keep-alive vercel.json
git commit -m "feat(db): add cv_documents with row level security"
```

---

### Task 3: Owner scoping and tombstones in the documents store

**Files:**
- Modify: `lib/store/documents.ts`
- Create: `lib/store/__tests__/documents-owner.test.ts`

**Interfaces:**
- Consumes: the existing `DocumentsStore`.
- Produces, added to `DocumentsState`:
  - `ownerId: string | null` — the Supabase user id these documents belong
    to; `null` means anonymous, local-only.
  - `tombstones: Record<string, number>` — deleted document id -> deletion
    time in ms.
- Produces, added to `DocumentsActions`:
  - `adoptOwner(userId: string): 'claimed' | 'switched' | 'unchanged'`
  - `releaseOwner(): void`
  - `applyRemote(documents: CvDocument[]): void`
  - `applyRemoteDeletes(ids: string[]): void`
  - `forgetTombstones(ids: string[]): void`
- The persisted store version goes `1 -> 2`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/store/__tests__/documents-owner.test.ts
import { describe, expect, it } from 'vitest'
import { createDocumentsStore, DOCUMENTS_STORAGE_KEY } from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  }
}

let counter = 0
const deps = { newId: () => `id-${++counter}`, now: () => 1_000 }

describe('owner scoping', () => {
  it('claims anonymous documents for the user who signs in', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()

    expect(store.getState().adoptOwner('user-a')).toBe('claimed')
    expect(store.getState().ownerId).toBe('user-a')
    expect(Object.keys(store.getState().documents)).toHaveLength(1)
  })

  it('is idempotent for the same user', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()
    store.getState().adoptOwner('user-a')

    expect(store.getState().adoptOwner('user-a')).toBe('unchanged')
    expect(Object.keys(store.getState().documents)).toHaveLength(1)
  })

  it('drops the previous account entirely when a different user signs in', () => {
    // The leak this prevents: two people share a laptop, and the second one
    // signs in to find the first one's CVs sitting in their account.
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()
    store.getState().adoptOwner('user-a')

    expect(store.getState().adoptOwner('user-b')).toBe('switched')
    expect(store.getState().documents).toEqual({})
    expect(store.getState().order).toEqual([])
    expect(store.getState().tombstones).toEqual({})
  })

  it('clears synced documents on sign-out, since they live on the server now', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    store.getState().createDocument()
    store.getState().adoptOwner('user-a')

    store.getState().releaseOwner()

    expect(store.getState().ownerId).toBeNull()
    expect(store.getState().documents).toEqual({})
  })
})

describe('tombstones', () => {
  it('records a deletion so other devices do not resurrect it', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = store.getState().createDocument()

    store.getState().deleteDocument(id)

    expect(store.getState().tombstones[id]).toBe(1_000)
    expect(store.getState().documents[id]).toBeUndefined()
  })

  it('clears a tombstone when the same id comes back from the server', () => {
    // Only ever reached when the remote copy is newer than the delete; the
    // merge planner decides that, not the store.
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = store.getState().createDocument()
    const doc = store.getState().documents[id]!
    store.getState().deleteDocument(id)

    store.getState().applyRemote([doc])

    expect(store.getState().tombstones[id]).toBeUndefined()
    expect(store.getState().documents[id]).toBeDefined()
    expect(store.getState().order).toContain(id)
  })

  it('forgets tombstones once they are safely on the server', () => {
    const store = createDocumentsStore({ storage: memoryStorage(), deps })
    const id = store.getState().createDocument()
    store.getState().deleteDocument(id)

    store.getState().forgetTombstones([id])

    expect(store.getState().tombstones).toEqual({})
  })
})

describe('persisted shape', () => {
  it('migrates a v1 payload by giving it an anonymous owner', () => {
    const storage = memoryStorage()
    storage.setItem(
      DOCUMENTS_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { documents: {}, order: [] } }),
    )

    const store = createDocumentsStore({ storage, deps })

    expect(store.getState().ownerId).toBeNull()
    expect(store.getState().tombstones).toEqual({})
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test lib/store/__tests__/documents-owner.test.ts`
Expected: FAIL — `adoptOwner is not a function`.

- [ ] **Step 3: Extend the state and actions**

In `lib/store/documents.ts`, add to `DocumentsState`:

```ts
export type DocumentsState = {
  documents: Record<string, CvDocument>
  /** Document ids, newest first. */
  order: string[]
  /**
   * The Supabase user these documents belong to, or null while anonymous.
   * Scoping the whole store rather than each document is what makes the
   * sign-out rule enforceable in one place.
   */
  ownerId: string | null
  /** Deleted document id -> deletion time in ms. */
  tombstones: Record<string, number>
}
```

and to `DocumentsActions`:

```ts
  adoptOwner(userId: string): 'claimed' | 'switched' | 'unchanged'
  releaseOwner(): void
  applyRemote(documents: CvDocument[]): void
  applyRemoteDeletes(ids: string[]): void
  forgetTombstones(ids: string[]): void
```

- [ ] **Step 4: Implement them**

Add these to the store body, and change `deleteDocument` to record a
tombstone:

```ts
        deleteDocument(id) {
          set((state) => {
            delete state.documents[id]
            state.order = state.order.filter((existing) => existing !== id)
            // Without this, a delete here is undone by any other device that
            // still holds the document: sync would read it as "missing
            // locally, present remotely" and pull it straight back.
            state.tombstones[id] = now()
          })
        },

        adoptOwner(userId) {
          const current = get().ownerId
          if (current === userId) return 'unchanged'

          if (current === null) {
            // Anonymous work becomes theirs. This is the promise the beta
            // banner makes: what you build now comes with you.
            set((state) => {
              state.ownerId = userId
            })
            return 'claimed'
          }

          // A different account on the same browser. Their documents are on
          // the server; the local copies are the previous user's and must not
          // follow them into this account.
          set((state) => {
            state.documents = {}
            state.order = []
            state.tombstones = {}
            state.ownerId = userId
          })
          return 'switched'
        },

        releaseOwner() {
          set((state) => {
            state.documents = {}
            state.order = []
            state.tombstones = {}
            state.ownerId = null
          })
        },

        applyRemote(documents) {
          set((state) => {
            for (const doc of documents) {
              state.documents[doc.id] = doc
              delete state.tombstones[doc.id]
              if (!state.order.includes(doc.id)) state.order.unshift(doc.id)
            }
          })
        },

        applyRemoteDeletes(ids) {
          set((state) => {
            for (const id of ids) {
              delete state.documents[id]
              state.order = state.order.filter((existing) => existing !== id)
              delete state.tombstones[id]
            }
          })
        },

        forgetTombstones(ids) {
          set((state) => {
            for (const id of ids) delete state.tombstones[id]
          })
        },
```

Seed the new fields in the initial state (`ownerId: null`, `tombstones: {}`).

- [ ] **Step 5: Persist the new fields, and migrate v1**

In the `persist` options: bump `version` to `2`, widen `partialize`, teach
`reviveState` about the new fields, and add a `migrate`:

```ts
      {
        name: DOCUMENTS_STORAGE_KEY,
        version: 2,
        storage: createJSONStorage(() => stringStorage),
        partialize: (state) => ({
          documents: state.documents,
          order: state.order,
          ownerId: state.ownerId,
          tombstones: state.tombstones,
        }),
        // v1 predates accounts, so everything in it is anonymous work that
        // the next sign-in should claim.
        migrate: (persisted, version) =>
          version < 2
            ? { ...(persisted as object), ownerId: null, tombstones: {} }
            : persisted,
        merge: (persisted, current) => ({ ...current, ...reviveState(persisted) }),
      },
```

and in `reviveState`, after the existing `order` reconciliation:

```ts
  const ownerId = typeof candidate.ownerId === 'string' ? candidate.ownerId : null

  const tombstones: Record<string, number> = {}
  const rawTombstones = candidate.tombstones
  if (typeof rawTombstones === 'object' && rawTombstones !== null) {
    for (const [id, at] of Object.entries(rawTombstones)) {
      // A tombstone for a document we also hold would delete it on the next
      // merge, so the live document wins here.
      if (typeof at === 'number' && !(id in documents)) tombstones[id] = at
    }
  }

  return { documents, order, ownerId, tombstones }
```

Update the `DocumentsHistory` partialize for zundo to keep tracking only
`documents` and `order`: undoing should never change who you are signed in as.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun run test lib/store`
Expected: PASS, including the existing `documents.test.ts` and
`documents-history.test.ts`.

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib/store
git commit -m "feat(store): scope documents to an owner and tombstone deletes"
```

---

### Task 4: The merge planner (pure, and where the real bugs live)

**Files:**
- Create: `lib/sync/types.ts`
- Create: `lib/sync/merge.ts`
- Create: `lib/sync/__tests__/merge.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type RemoteRecord = { id: string; updatedAt: number; deletedAt: number | null; doc: CvDocument | null }
  type SyncPlan = {
    pull: CvDocument[]          // remote wins; write into the store
    push: CvDocument[]          // local wins; write to the server
    deleteLocal: string[]       // remote deletions to apply locally
    pushDeletes: string[]       // local deletions to apply remotely
    settledTombstones: string[] // local tombstones the server already knows
  }
  function planSync(input: {
    local: CvDocument[]
    localTombstones: Record<string, number>
    remote: RemoteRecord[]
  }): SyncPlan
  ```
- This function is the whole conflict policy. It touches no network and no
  store, which is exactly why it is separated: every rule below is cheap to
  test here and expensive to test anywhere else.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/sync/__tests__/merge.test.ts
import { describe, expect, it } from 'vitest'
import { planSync } from '@/lib/sync/merge'
import type { RemoteRecord } from '@/lib/sync/types'
import type { CvDocument } from '@/lib/schema/cv'

function doc(id: string, updatedAt: number): CvDocument {
  // Only the two fields the planner reads matter here.
  return { id, updatedAt, name: id } as unknown as CvDocument
}

function remote(id: string, updatedAt: number, deletedAt: number | null = null): RemoteRecord {
  return { id, updatedAt, deletedAt, doc: deletedAt ? null : doc(id, updatedAt) }
}

const empty = { local: [], localTombstones: {}, remote: [] }

describe('planSync', () => {
  it('does nothing when both sides are empty', () => {
    expect(planSync(empty)).toEqual({
      pull: [], push: [], deleteLocal: [], pushDeletes: [], settledTombstones: [],
    })
  })

  it('pushes a document the server has never seen', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)] })
    expect(plan.push.map((d) => d.id)).toEqual(['a'])
  })

  it('pulls a document this device has never seen', () => {
    const plan = planSync({ ...empty, remote: [remote('a', 5)] })
    expect(plan.pull.map((d) => d.id)).toEqual(['a'])
  })

  it('leaves an identical document alone', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [remote('a', 5)] })
    expect(plan.push).toEqual([])
    expect(plan.pull).toEqual([])
  })

  it('pushes when the local copy is newer', () => {
    const plan = planSync({ ...empty, local: [doc('a', 9)], remote: [remote('a', 5)] })
    expect(plan.push.map((d) => d.id)).toEqual(['a'])
    expect(plan.pull).toEqual([])
  })

  it('pulls when the remote copy is newer', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [remote('a', 9)] })
    expect(plan.pull.map((d) => d.id)).toEqual(['a'])
    expect(plan.push).toEqual([])
  })

  it('applies a remote deletion locally', () => {
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [remote('a', 5, 7)] })
    expect(plan.deleteLocal).toEqual(['a'])
    expect(plan.push).toEqual([])
  })

  it('keeps a local edit made after the remote deletion', () => {
    // Deleted on the phone, then edited on the laptop. The edit is the more
    // recent intent, so the CV comes back rather than vanishing mid-session.
    const plan = planSync({ ...empty, local: [doc('a', 9)], remote: [remote('a', 5, 7)] })
    expect(plan.push.map((d) => d.id)).toEqual(['a'])
    expect(plan.deleteLocal).toEqual([])
  })

  it('pushes a local deletion the server has not applied', () => {
    const plan = planSync({ ...empty, localTombstones: { a: 7 }, remote: [remote('a', 5)] })
    expect(plan.pushDeletes).toEqual(['a'])
  })

  it('resurrects when the remote edit is newer than the local deletion', () => {
    const plan = planSync({ ...empty, localTombstones: { a: 5 }, remote: [remote('a', 9)] })
    expect(plan.pull.map((d) => d.id)).toEqual(['a'])
    expect(plan.pushDeletes).toEqual([])
  })

  it('never pulls a document the server has also deleted', () => {
    const plan = planSync({ ...empty, localTombstones: { a: 5 }, remote: [remote('a', 5, 6)] })
    expect(plan.pull).toEqual([])
    expect(plan.settledTombstones).toEqual(['a'])
  })

  it('drops a tombstone for a document the server has never heard of', () => {
    // Created and deleted while signed out. Nothing to tell the server.
    const plan = planSync({ ...empty, localTombstones: { a: 5 } })
    expect(plan.pushDeletes).toEqual([])
    expect(plan.settledTombstones).toEqual(['a'])
  })

  it('ignores a remote row whose payload failed to parse', () => {
    // Task 5 nulls out `doc` when the stored JSON no longer validates. A
    // corrupt row must not blank out a healthy local copy.
    const corrupt: RemoteRecord = { id: 'a', updatedAt: 99, deletedAt: null, doc: null }
    const plan = planSync({ ...empty, local: [doc('a', 5)], remote: [corrupt] })
    expect(plan.pull).toEqual([])
    expect(plan.deleteLocal).toEqual([])
  })

  it('handles a realistic first sign-in: local work, plus another device already synced', () => {
    const plan = planSync({
      local: [doc('a', 10), doc('b', 20)],
      localTombstones: {},
      remote: [remote('b', 5), remote('c', 30)],
    })
    expect(plan.push.map((d) => d.id).sort()).toEqual(['a', 'b'])
    expect(plan.pull.map((d) => d.id)).toEqual(['c'])
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test lib/sync`
Expected: FAIL, cannot resolve `@/lib/sync/merge`.

- [ ] **Step 3: Write the types**

```ts
// lib/sync/types.ts
import type { CvDocument } from '@/lib/schema/cv'

/**
 * One row of cv_documents, already validated. `doc` is null for a deleted row
 * and for a row whose payload no longer parses against the current schema.
 */
export type RemoteRecord = {
  id: string
  updatedAt: number
  deletedAt: number | null
  doc: CvDocument | null
}

export type SyncPlan = {
  pull: CvDocument[]
  push: CvDocument[]
  deleteLocal: string[]
  pushDeletes: string[]
  /** Local tombstones the server already agrees with; safe to forget. */
  settledTombstones: string[]
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error'
```

- [ ] **Step 4: Implement the planner**

```ts
// lib/sync/merge.ts
import type { CvDocument } from '@/lib/schema/cv'
import type { RemoteRecord, SyncPlan } from './types'

export type PlanInput = {
  local: CvDocument[]
  localTombstones: Record<string, number>
  remote: RemoteRecord[]
}

/**
 * Last-write-wins over `updatedAt`, with deletions treated as writes.
 *
 * The one rule worth stating out loud: a deletion is not special. It carries a
 * timestamp like any other edit and loses to anything newer. That is what
 * makes "deleted on my phone, then kept editing on my laptop" behave the way
 * a person expects, and it is why every branch below compares times rather
 * than checking presence.
 */
export function planSync({ local, localTombstones, remote }: PlanInput): SyncPlan {
  const plan: SyncPlan = {
    pull: [], push: [], deleteLocal: [], pushDeletes: [], settledTombstones: [],
  }

  const localById = new Map(local.map((doc) => [doc.id, doc]))
  const remoteById = new Map(remote.map((record) => [record.id, record]))

  for (const doc of local) {
    const record = remoteById.get(doc.id)
    if (!record) {
      plan.push.push(doc)
      continue
    }

    const remoteAt = record.deletedAt ?? record.updatedAt
    if (doc.updatedAt > remoteAt) {
      plan.push.push(doc)
    } else if (record.deletedAt !== null) {
      plan.deleteLocal.push(doc.id)
    } else if (record.updatedAt > doc.updatedAt && record.doc) {
      plan.pull.push(record.doc)
    }
    // Equal timestamps, or an unparseable remote payload: leave it alone.
  }

  for (const [id, deletedAt] of Object.entries(localTombstones)) {
    const record = remoteById.get(id)
    if (!record) {
      // Created and deleted before this account ever saw it.
      plan.settledTombstones.push(id)
      continue
    }
    if (record.deletedAt !== null) {
      plan.settledTombstones.push(id)
      continue
    }
    if (record.updatedAt > deletedAt) {
      if (record.doc) plan.pull.push(record.doc)
      plan.settledTombstones.push(id)
      continue
    }
    plan.pushDeletes.push(id)
  }

  for (const record of remote) {
    if (record.deletedAt !== null) continue
    if (!record.doc) continue
    if (localById.has(record.id)) continue
    if (record.id in localTombstones) continue
    plan.pull.push(record.doc)
  }

  return plan
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test lib/sync`
Expected: PASS, all 15.

- [ ] **Step 6: Commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib/sync
git commit -m "feat(sync): add the pure merge planner"
```

---

### Task 5: The remote store

**Files:**
- Create: `lib/sync/remote.ts`
- Create: `lib/sync/fake-remote.ts`
- Create: `lib/sync/__tests__/fake-remote.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type RemoteStore = {
    list(): Promise<RemoteRecord[]>
    upsert(documents: CvDocument[]): Promise<void>
    markDeleted(ids: string[], deletedAt: number): Promise<void>
  }
  function createSupabaseRemote(client: SupabaseClient, userId: string): RemoteStore
  function createFakeRemote(seed?: RemoteRecord[]): RemoteStore & { records: Map<string, RemoteRecord>; failNext(error?: Error): void }
  ```
- `createFakeRemote` is what Task 6's tests run against. Building it here,
  beside the real one, is what keeps the two honest about the same contract.

- [ ] **Step 1: Write the real remote store**

```ts
// lib/sync/remote.ts
import type { SupabaseClient } from '@supabase/supabase-js'

import type { CvDocument } from '@/lib/schema/cv'
import { safeMigrateDocument } from '@/lib/schema/migrations'
import type { RemoteRecord } from './types'

export type RemoteStore = {
  list(): Promise<RemoteRecord[]>
  upsert(documents: CvDocument[]): Promise<void>
  markDeleted(ids: string[], deletedAt: number): Promise<void>
}

const TABLE = 'cv_documents'

export function createSupabaseRemote(client: SupabaseClient, userId: string): RemoteStore {
  return {
    async list() {
      const { data, error } = await client
        .from(TABLE)
        .select('id, doc, updated_at, deleted_at')
        // RLS already scopes this, but saying it out loud keeps the query
        // honest if the policy is ever loosened.
        .eq('user_id', userId)

      if (error) throw error

      return (data ?? []).map((row): RemoteRecord => {
        if (row.deleted_at !== null) {
          return { id: row.id, updatedAt: row.updated_at, deletedAt: row.deleted_at, doc: null }
        }
        // A row written by an older release can hold an older schema. Run it
        // through the same migration path localStorage uses; a payload that
        // still fails becomes doc: null, which the planner leaves alone
        // rather than letting it overwrite a healthy local copy.
        const parsed = safeMigrateDocument(row.doc)
        return {
          id: row.id,
          updatedAt: row.updated_at,
          deletedAt: null,
          doc: parsed.ok ? parsed.document : null,
        }
      })
    },

    async upsert(documents) {
      if (documents.length === 0) return
      const { error } = await client.from(TABLE).upsert(
        documents.map((doc) => ({
          id: doc.id,
          user_id: userId,
          name: doc.name,
          doc,
          updated_at: doc.updatedAt,
          deleted_at: null,
        })),
        { onConflict: 'id' },
      )
      if (error) throw error
    },

    async markDeleted(ids, deletedAt) {
      if (ids.length === 0) return
      // The row stays as a tombstone so other devices learn about the delete.
      const { error } = await client
        .from(TABLE)
        .update({ deleted_at: deletedAt, doc: {}, name: '' })
        .in('id', ids)
      if (error) throw error
    },
  }
}
```

Note the `doc: {}` on delete: a deleted CV should not sit in the database in
full. `list()` never reads the payload of a deleted row, so blanking it costs
nothing and stops the table from holding personal data nobody asked it to.

- [ ] **Step 2: Write the fake**

```ts
// lib/sync/fake-remote.ts
import type { CvDocument } from '@/lib/schema/cv'
import type { RemoteStore } from './remote'
import type { RemoteRecord } from './types'

export type FakeRemote = RemoteStore & {
  records: Map<string, RemoteRecord>
  /** Makes exactly the next call reject, for testing offline behaviour. */
  failNext(error?: Error): void
  calls: { list: number; upsert: number; markDeleted: number }
}

export function createFakeRemote(seed: RemoteRecord[] = []): FakeRemote {
  const records = new Map(seed.map((record) => [record.id, record]))
  const calls = { list: 0, upsert: 0, markDeleted: 0 }
  let pendingError: Error | null = null

  function checkFailure() {
    if (!pendingError) return
    const error = pendingError
    pendingError = null
    throw error
  }

  return {
    records,
    calls,
    failNext(error = new Error('network')) {
      pendingError = error
    },
    async list() {
      calls.list += 1
      checkFailure()
      return [...records.values()]
    },
    async upsert(documents: CvDocument[]) {
      calls.upsert += 1
      checkFailure()
      for (const doc of documents) {
        records.set(doc.id, { id: doc.id, updatedAt: doc.updatedAt, deletedAt: null, doc })
      }
    },
    async markDeleted(ids: string[], deletedAt: number) {
      calls.markDeleted += 1
      checkFailure()
      for (const id of ids) {
        const existing = records.get(id)
        records.set(id, {
          id,
          updatedAt: existing?.updatedAt ?? deletedAt,
          deletedAt,
          doc: null,
        })
      }
    },
  }
}
```

- [ ] **Step 2b: Test the fake against the contract**

```ts
// lib/sync/__tests__/fake-remote.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeRemote } from '@/lib/sync/fake-remote'
import type { CvDocument } from '@/lib/schema/cv'

const doc = (id: string, updatedAt: number) => ({ id, updatedAt, name: id }) as unknown as CvDocument

describe('the fake remote', () => {
  it('round-trips an upsert', async () => {
    const remote = createFakeRemote()
    await remote.upsert([doc('a', 5)])
    expect(await remote.list()).toEqual([{ id: 'a', updatedAt: 5, deletedAt: null, doc: doc('a', 5) }])
  })

  it('keeps a deleted row as a tombstone with no payload', async () => {
    const remote = createFakeRemote()
    await remote.upsert([doc('a', 5)])
    await remote.markDeleted(['a'], 7)
    expect(await remote.list()).toEqual([{ id: 'a', updatedAt: 5, deletedAt: 7, doc: null }])
  })

  it('fails exactly once after failNext', async () => {
    const remote = createFakeRemote()
    remote.failNext()
    await expect(remote.list()).rejects.toThrow('network')
    await expect(remote.list()).resolves.toEqual([])
  })
})
```

- [ ] **Step 3: Verify and commit**

```bash
bun run test lib/sync
bun run typecheck
bun run lint
git add lib/sync
git commit -m "feat(sync): add the Supabase remote store and its fake"
```

---

### Task 6: The sync engine

**Files:**
- Create: `lib/utils/debounce-trailing.ts`
- Create: `lib/utils/__tests__/debounce-trailing.test.ts`
- Create: `lib/sync/engine.ts`
- Create: `lib/sync/status.ts`
- Create: `lib/sync/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `planSync` (Task 4), `RemoteStore` (Task 5), the documents store
  (Task 3).
- Produces:
  ```ts
  function debounceTrailing<A extends unknown[]>(fn: (...args: A) => void, ms: number): ((...args: A) => void) & { cancel(): void; flush(): void }
  function createSyncEngine(options: {
    store: DocumentsStoreApi
    remote: RemoteStore
    now?: () => number
    debounceMs?: number
    onStatus?: (status: SyncStatus) => void
  }): { syncNow(): Promise<void>; stop(): void }
  const useSyncStatus: StoreApi<{ status: SyncStatus; lastSyncedAt: number | null }>
  ```

- [ ] **Step 1: Write the debounce with its test**

```ts
// lib/utils/debounce-trailing.ts
/**
 * Trailing-edge debounce. The counterpart to throttle-leading: that one fires
 * first and swallows the rest, this one waits for the typing to stop. Pushing
 * on every keystroke would be one request per character.
 */
export function debounceTrailing<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: A | null = null

  const wrapped = (...args: A) => {
    pending = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const call = pending
      pending = null
      if (call) fn(...call)
    }, ms)
  }

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  wrapped.flush = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
    const call = pending
    pending = null
    if (call) fn(...call)
  }

  return wrapped
}
```

```ts
// lib/utils/__tests__/debounce-trailing.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounceTrailing } from '@/lib/utils/debounce-trailing'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('debounceTrailing', () => {
  it('fires once, after the quiet period, with the last arguments', () => {
    const spy = vi.fn()
    const debounced = debounceTrailing(spy, 100)
    debounced('a')
    debounced('b')
    vi.advanceTimersByTime(99)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledExactlyOnceWith('b')
  })

  it('flush fires immediately, cancel drops the call', () => {
    const spy = vi.fn()
    const debounced = debounceTrailing(spy, 100)
    debounced('a')
    debounced.flush()
    expect(spy).toHaveBeenCalledExactlyOnceWith('a')

    debounced('b')
    debounced.cancel()
    vi.advanceTimersByTime(200)
    expect(spy).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Write the failing engine tests**

```ts
// lib/sync/__tests__/engine.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSyncEngine } from '@/lib/sync/engine'
import { createFakeRemote } from '@/lib/sync/fake-remote'
import { createDocumentsStore } from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

let counter = 0
let clock = 1_000
const deps = { newId: () => `id-${++counter}`, now: () => clock }

function setup(seed = []) {
  const store = createDocumentsStore({ storage: memoryStorage(), deps })
  const remote = createFakeRemote(seed)
  const statuses: string[] = []
  const engine = createSyncEngine({
    store,
    remote,
    now: () => clock,
    debounceMs: 50,
    onStatus: (status) => statuses.push(status),
  })
  return { store, remote, engine, statuses }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('the sync engine', () => {
  it('pushes everything local on the first sync', async () => {
    const { store, remote, engine } = setup()
    store.getState().createDocument()
    store.getState().createDocument()

    await engine.syncNow()

    expect(remote.records.size).toBe(2)
  })

  it('pulls what the account already holds', async () => {
    const { store, engine } = setup([
      { id: 'remote-1', updatedAt: 9_000, deletedAt: null, doc: { id: 'remote-1', updatedAt: 9_000 } },
    ])

    await engine.syncNow()

    expect(store.getState().documents['remote-1']).toBeDefined()
    expect(store.getState().order).toContain('remote-1')
  })

  it('pushes a local delete and then forgets the tombstone', async () => {
    const { store, remote, engine } = setup()
    const id = store.getState().createDocument()
    await engine.syncNow()

    clock += 1_000
    store.getState().deleteDocument(id)
    await engine.syncNow()

    expect(remote.records.get(id)?.deletedAt).toBe(clock)
    expect(store.getState().tombstones).toEqual({})
  })

  it('debounces edits into one push', async () => {
    const { store, remote, engine } = setup()
    const id = store.getState().createDocument()
    await engine.syncNow()
    const before = remote.calls.upsert

    for (let i = 0; i < 5; i += 1) {
      clock += 10
      store.getState().renameDocument(id, `name ${i}`)
    }
    await vi.advanceTimersByTimeAsync(60)

    expect(remote.calls.upsert - before).toBe(1)
    expect(remote.records.get(id)?.doc?.name).toBe('name 4')
  })

  it('reports offline on failure and recovers on the next sync', async () => {
    const { store, remote, engine, statuses } = setup()
    store.getState().createDocument()
    remote.failNext()

    await engine.syncNow()
    expect(statuses).toContain('offline')

    await engine.syncNow()
    expect(statuses.at(-1)).toBe('idle')
    expect(remote.records.size).toBe(1)
  })

  it('stops listening after stop(), so a signed-out store never pushes', async () => {
    const { store, remote, engine } = setup()
    await engine.syncNow()
    engine.stop()

    store.getState().createDocument()
    await vi.advanceTimersByTimeAsync(200)

    expect(remote.calls.upsert).toBe(0)
  })
})
```

- [ ] **Step 3: Run them and watch them fail**

Run: `bun run test lib/sync/__tests__/engine.test.ts`
Expected: FAIL, cannot resolve `@/lib/sync/engine`.

- [ ] **Step 4: Write the status store**

```ts
// lib/sync/status.ts
import { create } from 'zustand'
import type { SyncStatus } from './types'

type SyncStatusState = {
  status: SyncStatus
  lastSyncedAt: number | null
  set(status: SyncStatus, lastSyncedAt?: number): void
}

/**
 * Deliberately separate from the documents store: sync status is not part of
 * the document history, and mixing it in would make undo step through
 * "syncing" states.
 */
export const useSyncStatus = create<SyncStatusState>()((set) => ({
  status: 'off',
  lastSyncedAt: null,
  set: (status, lastSyncedAt) =>
    set((state) => ({ status, lastSyncedAt: lastSyncedAt ?? state.lastSyncedAt })),
}))
```

- [ ] **Step 5: Write the engine**

```ts
// lib/sync/engine.ts
import type { DocumentsStoreApi } from '@/lib/store/documents'
import { selectOrderedDocuments } from '@/lib/store/documents'
import { debounceTrailing } from '@/lib/utils/debounce-trailing'
import { planSync } from './merge'
import type { RemoteStore } from './remote'
import type { SyncStatus } from './types'

export const SYNC_DEBOUNCE_MS = 2_000

export type SyncEngine = {
  syncNow(): Promise<void>
  stop(): void
}

export function createSyncEngine({
  store,
  remote,
  now = () => Date.now(),
  debounceMs = SYNC_DEBOUNCE_MS,
  onStatus,
}: {
  store: DocumentsStoreApi
  remote: RemoteStore
  now?: () => number
  debounceMs?: number
  onStatus?: (status: SyncStatus) => void
}): SyncEngine {
  let stopped = false
  let running: Promise<void> | null = null

  function report(status: SyncStatus) {
    if (!stopped || status === 'off') onStatus?.(status)
  }

  async function runOnce() {
    const state = store.getState()
    const plan = planSync({
      local: selectOrderedDocuments(state),
      localTombstones: state.tombstones,
      remote: await remote.list(),
    })

    // Remote-to-local first: applying the server's view before pushing means a
    // failure halfway through leaves the local store consistent with what the
    // server already holds, rather than ahead of it.
    if (plan.pull.length > 0) store.getState().applyRemote(plan.pull)
    if (plan.deleteLocal.length > 0) store.getState().applyRemoteDeletes(plan.deleteLocal)

    await remote.upsert(plan.push)
    await remote.markDeleted(plan.pushDeletes, now())

    const settled = [...plan.settledTombstones, ...plan.pushDeletes]
    if (settled.length > 0) store.getState().forgetTombstones(settled)
  }

  async function syncNow(): Promise<void> {
    if (stopped) return
    // Serialise: two overlapping syncs would each read the other's half-done
    // state and fight.
    if (running) return running

    report('syncing')
    running = runOnce()
      .then(() => {
        report('idle')
      })
      .catch((error: unknown) => {
        // No dirty-set to persist: every unsynced change is still in the store
        // with a newer updatedAt than the server's copy, so the next full
        // merge picks it up on its own. That is the whole reason the planner
        // derives everything from timestamps.
        console.warn('[sync] failed, will retry', error)
        report(isOffline() ? 'offline' : 'error')
      })
      .finally(() => {
        running = null
      })

    return running
  }

  function isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false
  }

  const scheduled = debounceTrailing(() => void syncNow(), debounceMs)

  const unsubscribe = store.subscribe((state, previous) => {
    if (stopped) return
    // Only document changes are worth a round trip. Owner changes are driven
    // by the provider, which calls syncNow itself.
    if (state.documents === previous.documents && state.order === previous.order) return
    scheduled()
  })

  const retry = () => void syncNow()
  if (typeof window !== 'undefined') window.addEventListener('online', retry)

  return {
    syncNow,
    stop() {
      stopped = true
      scheduled.cancel()
      unsubscribe()
      if (typeof window !== 'undefined') window.removeEventListener('online', retry)
      report('off')
    },
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun run test lib/sync lib/utils`
Expected: PASS.

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib/sync lib/utils
git commit -m "feat(sync): add the sync engine"
```

---

### Task 7: Proxy composition, callback and sign-out routes

**Files:**
- Create: `lib/supabase/proxy.ts`
- Modify: `proxy.ts`
- Create: `app/auth/callback/route.ts`
- Create: `app/auth/sign-out/route.ts`
- Create: `app/auth/auth-code-error/page.tsx`
- Create: `lib/auth/redirect.ts`
- Create: `lib/auth/__tests__/redirect.test.ts`

**Interfaces:**
- Produces:
  - `updateSupabaseSession(request: NextRequest, response: NextResponse): Promise<NextResponse>`
  - `safeNextPath(raw: string | null, fallback?: string): string`
- The auth routes live **outside** `[locale]`. They are machine endpoints, not
  pages, and locale-prefixing them would mean registering four redirect URLs
  in three consoles instead of one.

- [ ] **Step 1: Write the failing redirect-guard test**

```ts
// lib/auth/__tests__/redirect.test.ts
import { describe, expect, it } from 'vitest'
import { safeNextPath } from '@/lib/auth/redirect'

describe('safeNextPath', () => {
  it('keeps a relative app path', () => {
    expect(safeNextPath('/no/cv')).toBe('/no/cv')
  })

  it('falls back when the parameter is missing', () => {
    expect(safeNextPath(null)).toBe('/')
  })

  it('refuses an absolute URL, which would be an open redirect', () => {
    expect(safeNextPath('https://evil.example/phish')).toBe('/')
  })

  it('refuses a protocol-relative URL, which browsers also treat as absolute', () => {
    expect(safeNextPath('//evil.example/phish')).toBe('/')
  })

  it('refuses a backslash-prefixed path, which some browsers normalise to //', () => {
    expect(safeNextPath('/\\evil.example')).toBe('/')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test lib/auth`
Expected: FAIL.

- [ ] **Step 3: Implement the guard**

```ts
// lib/auth/redirect.ts
/**
 * The `next` parameter comes back from an OAuth round trip, so it is attacker
 * influenceable: anything that is not plainly a path on this site becomes the
 * fallback. Rejecting `//` and `/\` matters as much as rejecting `https://` —
 * browsers read both as "somewhere else entirely".
 */
export function safeNextPath(raw: string | null, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  if (raw.startsWith('/\\')) return fallback
  return raw
}
```

- [ ] **Step 4: Write the session refresher**

```ts
// lib/supabase/proxy.ts
import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { readSupabaseEnv } from './env'

/**
 * Refreshes the Supabase session and writes the rotated cookies onto a
 * response that next-intl has already built.
 *
 * The order matters and is the whole reason this is a helper rather than a
 * second proxy: next-intl owns the response (it may be a redirect, and it
 * carries the locale headers), so Supabase's cookies are attached to that
 * object instead of a fresh NextResponse.next(). Building a new response here
 * would silently drop either the locale handling or the refreshed session.
 */
export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const env = readSupabaseEnv()
  if (!env) return response

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // This call is the point of the whole function: it is what rotates an
  // expiring token. getClaims verifies the JWT locally against the cached
  // JWKS, so it costs no network round trip on the happy path — unlike
  // getUser, which does. Do not put code between the client creation and this
  // call; anything that throws in between leaves users randomly signed out.
  await supabase.auth.getClaims()

  return response
}
```

> **Check before writing this:** confirm the installed `@supabase/supabase-js`
> exposes `auth.getClaims` — `grep -r "getClaims" node_modules/@supabase/supabase-js/dist/module/lib/ | head`.
> If it does not, use `await supabase.auth.getUser()` instead; it refreshes
> the same way at the cost of one network call per request.

- [ ] **Step 5: Compose the proxy**

```ts
// proxy.ts
import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { routing } from './i18n/routing'
import { updateSupabaseSession } from './lib/supabase/proxy'

const handleI18n = createMiddleware(routing)

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request)
  return updateSupabaseSession(request, response)
}

export const config = {
  // `auth` joins the exclusions: /auth/callback is a machine endpoint that
  // must never be rewritten to /no/auth/callback, or the OAuth redirect
  // registered with Google and Apple stops matching.
  matcher: '/((?!api|auth|_next|_vercel|.*\\..*).*)',
}
```

- [ ] **Step 6: Write the callback route**

```ts
// app/auth/callback/route.ts
import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  const supabase = await getServerSupabase()
  if (!supabase || !code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  // Behind Vercel's load balancer the request origin is the internal host, so
  // the forwarded host is the one the user actually typed.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const base =
    process.env.NODE_ENV === 'development' || !forwardedHost
      ? origin
      : `https://${forwardedHost}`

  return NextResponse.redirect(`${base}${next}`)
}
```

- [ ] **Step 7: Write the sign-out route**

```ts
// app/auth/sign-out/route.ts
import { NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/auth/redirect'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * POST only. A GET sign-out can be triggered by any image tag on any page,
 * which is a real (if petty) way to log people out of an app.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const form = await request.formData().catch(() => null)
  const next = safeNextPath(form?.get('next')?.toString() ?? null)

  const supabase = await getServerSupabase()
  await supabase?.auth.signOut()

  return NextResponse.redirect(`${origin}${next}`, { status: 303 })
}
```

- [ ] **Step 8: Write the error page**

```tsx
// app/auth/auth-code-error/page.tsx
import Link from 'next/link'

/**
 * Outside [locale] with the rest of the auth endpoints, so it is deliberately
 * bilingual rather than translated: there is no locale in the URL to read.
 */
export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Innloggingen ble avbrutt</h1>
      <p className="text-muted-foreground">
        Vi fikk ikke fullført innloggingen. Prøv igjen — CV-ene dine ligger trygt lagret lokalt.
      </p>
      <p className="text-sm text-muted-foreground">
        Sign-in could not be completed. Please try again; your CVs are safe on this device.
      </p>
      <Link className="font-semibold text-brand hover:underline" href="/">
        CVApp
      </Link>
    </main>
  )
}
```

- [ ] **Step 9: Verify the routes are reachable and locale-free**

```bash
bun run dev
```

Then, in another shell:

```bash
# 404 or a redirect to auth-code-error is correct here. A 307 to
# /no/auth/callback means the proxy matcher is still swallowing it.
curl -i -s http://localhost:3001/auth/callback | head -5
```

- [ ] **Step 10: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
bun run build
git add proxy.ts lib/supabase lib/auth app/auth
git commit -m "feat(auth): add OAuth callback, sign-out and session refresh"
```

---

### Task 8: Sign-in UI

**Files:**
- Create: `lib/auth/providers.ts`
- Create: `components/auth/SignInButtons.tsx`
- Create: `components/auth/__tests__/SignInButtons.test.tsx`
- Create: `app/[locale]/login/page.tsx`
- Modify: `messages/no.json`, `messages/en.json`

**Interfaces:**
- Consumes: `enabledProviders`, `getBrowserSupabase` (Task 1).
- Produces: `PROVIDER_LABELS: Record<OAuthProvider, string>`, and a
  `<SignInButtons next={string} />` client component.

- [ ] **Step 1: Add the strings to both catalogues**

`messages/no.json`, new `auth` namespace:

```json
  "auth": {
    "signIn": "Logg inn",
    "signOut": "Logg ut",
    "signInTitle": "Logg inn på CVApp",
    "signInLead": "Da følger CV-ene dine med deg mellom mobil og PC. Alt du har laget nå blir liggende.",
    "continueWith": "Fortsett med {provider}",
    "unavailable": "Innlogging er ikke slått på ennå. CV-ene dine lagres på denne enheten.",
    "account": "Konto",
    "syncing": "Lagrer …",
    "synced": "Lagret på kontoen din",
    "offline": "Frakoblet — lagres når du er på nett igjen",
    "error": "Klarte ikke å lagre til kontoen",
    "localOnly": "Lagret bare på denne enheten"
  },
```

`messages/en.json`, the same keys:

```json
  "auth": {
    "signIn": "Sign in",
    "signOut": "Sign out",
    "signInTitle": "Sign in to CVApp",
    "signInLead": "Your CVs then follow you between your phone and your computer. Everything you have made stays.",
    "continueWith": "Continue with {provider}",
    "unavailable": "Sign-in is not switched on yet. Your CVs are saved on this device.",
    "account": "Account",
    "syncing": "Saving …",
    "synced": "Saved to your account",
    "offline": "Offline — will save when you reconnect",
    "error": "Could not save to your account",
    "localOnly": "Saved on this device only"
  },
```

The parity test in `i18n/__tests__/messages.test.ts` fails if these drift.
Run `bun run test i18n` after editing to confirm both are in step.

- [ ] **Step 2: Write the provider metadata**

```ts
// lib/auth/providers.ts
import type { OAuthProvider } from '@/lib/supabase/env'

/**
 * Provider names are trademarks and are never translated: Google's and
 * Apple's brand guidelines both require the name to appear verbatim.
 */
export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
}
```

- [ ] **Step 3: Write the failing component test**

```tsx
// components/auth/__tests__/SignInButtons.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { SignInButtons } from '@/components/auth/SignInButtons'
import messages from '@/messages/no.json'

const signInWithOAuth = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({ auth: { signInWithOAuth } }),
}))

const providers = vi.hoisted(() => ({ value: ['google', 'apple'] as string[] }))
vi.mock('@/lib/supabase/env', () => ({ enabledProviders: () => providers.value }))

function renderButtons(next = '/no/cv') {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <SignInButtons next={next} />
    </NextIntlClientProvider>,
  )
}

describe('SignInButtons', () => {
  it('renders one button per configured provider', () => {
    providers.value = ['google', 'apple']
    renderButtons()
    expect(screen.getByRole('button', { name: /Google/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Apple/ })).toBeInTheDocument()
  })

  it('shows only what is configured, so a disabled provider is never offered', () => {
    providers.value = ['google']
    renderButtons()
    expect(screen.queryByRole('button', { name: /Apple/ })).not.toBeInTheDocument()
  })

  it('explains itself rather than rendering nothing when auth is off', () => {
    providers.value = []
    renderButtons()
    expect(screen.getByText(messages.auth.unavailable)).toBeInTheDocument()
  })

  it('sends the user back where they started after the round trip', async () => {
    providers.value = ['google']
    renderButtons('/no/cv')

    await userEvent.click(screen.getByRole('button', { name: /Google/ }))

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback?next=%2Fno%2Fcv') },
    })
  })
})
```

- [ ] **Step 4: Run it and watch it fail**

Run: `bun run test components/auth`
Expected: FAIL.

- [ ] **Step 5: Implement the buttons**

```tsx
// components/auth/SignInButtons.tsx
'use client'

import { LogIn } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { PROVIDER_LABELS } from '@/lib/auth/providers'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { enabledProviders, type OAuthProvider } from '@/lib/supabase/env'

export function SignInButtons({ next = '/' }: { next?: string }) {
  const t = useTranslations('auth')
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const providers = enabledProviders()

  if (providers.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('unavailable')}</p>
  }

  async function signIn(provider: OAuthProvider) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    setPending(provider)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
    // On success the browser has already left for the provider; only a
    // failure ever gets here.
    if (error) setPending(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          disabled={pending !== null}
          key={provider}
          onClick={() => void signIn(provider)}
          type="button"
        >
          <LogIn aria-hidden="true" className="size-4" />
          {t('continueWith', { provider: PROVIDER_LABELS[provider] })}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Write the login page**

```tsx
// app/[locale]/login/page.tsx
import { getTranslations } from 'next-intl/server'

import { SignInButtons } from '@/components/auth/SignInButtons'

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { locale } = await params
  const { next } = await searchParams
  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16 sm:py-24">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('signInTitle')}</h1>
        <p className="text-muted-foreground">{t('signInLead')}</p>
      </div>
      <SignInButtons next={next ?? `/${locale}/cv`} />
    </main>
  )
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun run test components/auth i18n`
Expected: PASS.

- [ ] **Step 8: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add components/auth lib/auth app/\[locale\]/login messages
git commit -m "feat(auth): add the sign-in page and provider buttons"
```

---

### Task 9: Mount the session — header menu, sync provider, status badge

**Files:**
- Create: `components/auth/SessionProvider.tsx`
- Create: `components/auth/AccountMenu.tsx`
- Create: `components/auth/SyncStatusBadge.tsx`
- Create: `components/auth/__tests__/SyncStatusBadge.test.tsx`
- Modify: `components/chrome/AppHeader.tsx`
- Modify: `app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: `createSyncEngine` (Task 6), `useSyncStatus` (Task 6),
  `getBrowserSupabase` (Task 1), `adoptOwner`/`releaseOwner` (Task 3).
- Produces: `useSessionUser(): { id: string; email: string | null } | null`
  from a React context, and the `<SessionProvider>` that mounts the engine.

- [ ] **Step 1: Write the provider**

```tsx
// components/auth/SessionProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { createSupabaseRemote } from '@/lib/sync/remote'
import { createSyncEngine } from '@/lib/sync/engine'
import { useSyncStatus } from '@/lib/sync/status'
import { useDocuments } from '@/lib/store/documents'
import { getBrowserSupabase } from '@/lib/supabase/client'

export type SessionUser = { id: string; email: string | null }

const SessionContext = createContext<SessionUser | null>(null)

export function useSessionUser(): SessionUser | null {
  return useContext(SessionContext)
}

/**
 * Owns the whole lifecycle: session in, engine up; session out, engine down
 * and local state cleared. Keeping it in one component is what makes the
 * sign-out rule from Task 3 checkable by reading a single file.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return

    let engine: ReturnType<typeof createSyncEngine> | null = null

    function teardown() {
      engine?.stop()
      engine = null
    }

    function startFor(nextUser: SessionUser) {
      teardown()
      // adoptOwner decides whether this is the same person coming back,
      // anonymous work being claimed, or a different account that must not
      // inherit the previous one's documents.
      useDocuments.getState().adoptOwner(nextUser.id)

      const remote = createSupabaseRemote(supabase!, nextUser.id)
      engine = createSyncEngine({
        store: useDocuments,
        remote,
        onStatus: (status) => useSyncStatus.getState().set(status, Date.now()),
      })
      void engine.syncNow()
      setUser(nextUser)
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        startFor({ id: session.user.id, email: session.user.email ?? null })
        return
      }
      teardown()
      if (event === 'SIGNED_OUT') useDocuments.getState().releaseOwner()
      useSyncStatus.getState().set('off')
      setUser(null)
    })

    return () => {
      data.subscription.unsubscribe()
      teardown()
    }
  }, [])

  return <SessionContext value={user}>{children}</SessionContext>
}
```

> `onAuthStateChange` fires an `INITIAL_SESSION` event on mount, which is how
> a returning user's engine starts without a separate `getSession()` call. Do
> not add one: two code paths racing to start the engine is exactly the bug
> the memoised client in Task 1 exists to avoid.

- [ ] **Step 2: Write the status badge with its test**

```tsx
// components/auth/SyncStatusBadge.tsx
'use client'

import { Cloud, CloudOff, HardDrive, RefreshCw, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useSyncStatus } from '@/lib/sync/status'

const ICONS = {
  off: HardDrive,
  idle: Cloud,
  syncing: RefreshCw,
  offline: CloudOff,
  error: TriangleAlert,
} as const

const LABEL_KEYS = {
  off: 'localOnly',
  idle: 'synced',
  syncing: 'syncing',
  offline: 'offline',
  error: 'error',
} as const

export function SyncStatusBadge() {
  const t = useTranslations('auth')
  const status = useSyncStatus((state) => state.status)
  const Icon = ICONS[status]
  const label = t(LABEL_KEYS[status])

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        status === 'error' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'
      }`}
      // The icon carries no text of its own, so the whole badge is the label.
      title={label}
    >
      <Icon aria-hidden="true" className={`size-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </span>
  )
}
```

```tsx
// components/auth/__tests__/SyncStatusBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it } from 'vitest'

import { SyncStatusBadge } from '@/components/auth/SyncStatusBadge'
import { useSyncStatus } from '@/lib/sync/status'
import messages from '@/messages/no.json'

function renderBadge() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <SyncStatusBadge />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => useSyncStatus.setState({ status: 'off', lastSyncedAt: null }))

describe('SyncStatusBadge', () => {
  it('says the CVs are local when nobody is signed in', () => {
    renderBadge()
    expect(screen.getByText(messages.auth.localOnly)).toBeInTheDocument()
  })

  it('reports a failure visibly rather than pretending to be saved', () => {
    useSyncStatus.setState({ status: 'error', lastSyncedAt: null })
    renderBadge()
    expect(screen.getByText(messages.auth.error)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Write the account menu**

```tsx
// components/auth/AccountMenu.tsx
'use client'

import { LogIn, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useSessionUser } from '@/components/auth/SessionProvider'
import { Link } from '@/i18n/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export function AccountMenu() {
  const t = useTranslations('auth')
  const user = useSessionUser()

  // Nothing to offer when auth is switched off; the header stays as it is
  // today rather than growing a button that cannot work.
  if (!isSupabaseConfigured()) return null

  const className =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-brand-soft hover:text-brand-strong'

  if (!user) {
    return (
      <Link className={className} href="/login">
        <LogIn aria-hidden="true" className="size-4" />
        {t('signIn')}
      </Link>
    )
  }

  return (
    <Link className={className} href="/account">
      <UserRound aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{user.email ?? t('account')}</span>
      <span className="sm:hidden">{t('account')}</span>
    </Link>
  )
}
```

- [ ] **Step 4: Mount them**

In `app/[locale]/layout.tsx`, wrap the existing children in
`<SessionProvider>` — inside `NextIntlClientProvider`, so the auth strings
resolve.

In `components/chrome/AppHeader.tsx`, add `<AccountMenu />` to the `<nav>`,
between the "Mine CV-er" link and the locale switcher.

- [ ] **Step 5: Show the status on the dashboard**

In `app/[locale]/cv/page.tsx`, put `<SyncStatusBadge />` beside the `<h1>`,
inside the existing flex row. It is the one place a person looks to ask "are
my CVs safe?", so that is where the answer belongs.

- [ ] **Step 6: Verify in the browser**

```bash
bun run dev
```

With no Supabase env set, at <http://localhost:3001/no/cv>: the header shows
no sign-in link, the badge reads "Lagret bare på denne enheten", and creating
and editing a CV behaves exactly as before. This is the degradation case from
the Global Constraints, and it is worth eyeballing rather than trusting.

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add components app/\[locale\]/layout.tsx app/\[locale\]/cv/page.tsx
git commit -m "feat(auth): mount the session, sync engine and status badge"
```

---

### Task 10: The account page, including deleting the account

**Files:**
- Create: `lib/auth/dal.ts`
- Create: `app/[locale]/account/page.tsx`
- Create: `components/auth/AccountPanel.tsx`
- Create: `app/auth/delete-account/route.ts`
- Create: `supabase/migrations/20260908000002_delete_own_account.sql`
- Modify: `messages/no.json`, `messages/en.json`

**Interfaces:**
- Produces: `getSessionUser(): Promise<SessionUserDto | null>` where
  `SessionUserDto = { id: string; email: string | null; provider: string | null }`.

- [ ] **Step 1: Write the data access layer**

```ts
// lib/auth/dal.ts
import 'server-only'

import { cache } from 'react'

import { getServerSupabase } from '@/lib/supabase/server'

/**
 * A DTO, not the Supabase user. That object carries app_metadata, identities
 * and provider tokens; none of it belongs in a client bundle, and returning
 * the whole thing is how it ends up there by accident.
 */
export type SessionUserDto = {
  id: string
  email: string | null
  provider: string | null
}

export const getSessionUser = cache(async (): Promise<SessionUserDto | null> => {
  const supabase = await getServerSupabase()
  if (!supabase) return null

  // getUser, not getSession: this drives what the page shows about the
  // account, so it should be the server's answer rather than a decoded cookie.
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    provider: data.user.app_metadata?.provider ?? null,
  }
})
```

- [ ] **Step 2: Add the account strings to both catalogues**

Extend the `auth` namespace in `messages/no.json`:

```json
    "accountTitle": "Kontoen din",
    "signedInAs": "Innlogget som {email}",
    "signedInWith": "via {provider}",
    "cvCount": "{count, plural, =0 {Ingen CV-er} =1 {# CV} other {# CV-er}} på kontoen",
    "downloadAll": "Last ned alle CV-ene mine",
    "deleteAccount": "Slett kontoen min",
    "deleteWarning": "Dette sletter kontoen og alle CV-ene på den, for godt. Last ned CV-ene dine først hvis du vil beholde dem.",
    "deleteConfirm": "Skriv SLETT for å bekrefte",
    "deleteConfirmWord": "SLETT",
    "claimed": "{count, plural, =1 {# CV} other {# CV-er}} ble lagret på kontoen din."
```

and the matching English:

```json
    "accountTitle": "Your account",
    "signedInAs": "Signed in as {email}",
    "signedInWith": "via {provider}",
    "cvCount": "{count, plural, =0 {No CVs} =1 {# CV} other {# CVs}} on this account",
    "downloadAll": "Download all my CVs",
    "deleteAccount": "Delete my account",
    "deleteWarning": "This permanently deletes your account and every CV on it. Download your CVs first if you want to keep them.",
    "deleteConfirm": "Type DELETE to confirm",
    "deleteConfirmWord": "DELETE",
    "claimed": "{count, plural, =1 {# CV} other {# CVs}} saved to your account."
```

- [ ] **Step 3: Write the delete-account SQL**

```sql
-- supabase/migrations/20260908000002_delete_own_account.sql
--
-- GDPR Article 17. A person must be able to delete their account without
-- emailing anyone, and this is the smallest way to offer it: a definer
-- function scoped to auth.uid(), so the app needs no service-role key to
-- call it. cv_documents rows go with the user through the cascade on
-- cv_documents.user_id.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
```

Apply it the same way as Task 2, and verify the grants:

```sql
-- Should list `authenticated` and nothing else.
select grantee from information_schema.routine_privileges
where routine_name = 'delete_own_account';
```

- [ ] **Step 4: Write the delete route**

```ts
// app/auth/delete-account/route.ts
import { NextResponse } from 'next/server'

import { getServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.redirect(`${origin}/`, { status: 303 })

  const { error } = await supabase.rpc('delete_own_account')
  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`, { status: 303 })
  }

  // The account is gone; the cookies pointing at it must go too, and the
  // client's local copies are cleared by SessionProvider on SIGNED_OUT.
  await supabase.auth.signOut()
  return NextResponse.redirect(`${origin}/`, { status: 303 })
}
```

- [ ] **Step 5: Write the account panel**

`components/auth/AccountPanel.tsx` is a client component taking
`user: SessionUserDto`. It renders:
- `signedInAs` with the email, and `signedInWith` when a provider is known
- `<SyncStatusBadge />`
- `cvCount` from `useDocuments(useShallow(selectOrderedDocuments)).length`,
  guarded by `useHydrated()` exactly as the dashboard does
- **Download all** — reuses `serialiseDocument`/`backupFilename` from
  `lib/store/backup.ts` in a loop; no new export format
- **Sign out** — a `<form action="/auth/sign-out" method="post">` with a
  hidden `next` input, so it works without JavaScript and cannot be triggered
  by a GET
- **Delete account** — the same, posting to `/auth/delete-account`, behind a
  typed confirmation: the submit button stays `disabled` until the text input
  equals `t('deleteConfirmWord')`. Show `deleteWarning` above it.

Both destructive controls use `type="submit"` inside their own form; do not
nest forms.

- [ ] **Step 6: Write the page**

```tsx
// app/[locale]/account/page.tsx
import { getTranslations } from 'next-intl/server'

import { AccountPanel } from '@/components/auth/AccountPanel'
import { SignInButtons } from '@/components/auth/SignInButtons'
import { getSessionUser } from '@/lib/auth/dal'

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  const user = await getSessionUser()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t('accountTitle')}</h1>
      {user ? <AccountPanel user={user} /> : <SignInButtons next={`/${locale}/account`} />}
    </main>
  )
}
```

- [ ] **Step 7: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add lib/auth app/\[locale\]/account app/auth components/auth supabase messages
git commit -m "feat(auth): add the account page with export and account deletion"
```

---

### Task 11: Tell people their CVs came with them

**Files:**
- Create: `components/auth/ClaimNotice.tsx`
- Create: `components/auth/__tests__/ClaimNotice.test.tsx`
- Modify: `components/auth/SessionProvider.tsx`
- Modify: `lib/sync/status.ts`

**Interfaces:**
- Produces: `useSyncStatus` gains `claimedCount: number | null` and
  `clearClaimed(): void`.

The beta banner promises that what you make now comes with you. This task is
the moment that promise is either visibly kept or silently assumed.

- [ ] **Step 1: Record the claim**

Add `claimedCount: number | null` to `useSyncStatus`. In
`SessionProvider.startFor`, capture the local document count *before*
`adoptOwner`, and when the result is `'claimed'` and that count was above
zero, set `claimedCount`.

```ts
      const localCount = Object.keys(useDocuments.getState().documents).length
      const outcome = useDocuments.getState().adoptOwner(nextUser.id)
      if (outcome === 'claimed' && localCount > 0) {
        useSyncStatus.getState().setClaimed(localCount)
      }
```

- [ ] **Step 2: Write the failing notice test**

```tsx
// components/auth/__tests__/ClaimNotice.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it } from 'vitest'

import { ClaimNotice } from '@/components/auth/ClaimNotice'
import { useSyncStatus } from '@/lib/sync/status'
import messages from '@/messages/no.json'

function renderNotice() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <ClaimNotice />
    </NextIntlClientProvider>,
  )
}

beforeEach(() => useSyncStatus.setState({ claimedCount: null }))

describe('ClaimNotice', () => {
  it('says nothing when nothing was claimed', () => {
    const { container } = renderNotice()
    expect(container).toBeEmptyDOMElement()
  })

  it('names the number of CVs that followed the user in', () => {
    useSyncStatus.setState({ claimedCount: 3 })
    renderNotice()
    expect(screen.getByText('3 CV-er ble lagret på kontoen din.')).toBeInTheDocument()
  })

  it('can be dismissed, and stays dismissed', async () => {
    useSyncStatus.setState({ claimedCount: 1 })
    renderNotice()
    await userEvent.click(screen.getByRole('button'))
    expect(useSyncStatus.getState().claimedCount).toBeNull()
  })
})
```

- [ ] **Step 3: Implement the notice**

A dismissible banner using the `claimed` string, rendered on
`app/[locale]/cv/page.tsx` above the list. Match the visual language of the
existing beta banner rather than inventing a new one; give the dismiss button
its own `aria-label` (reuse `beta.close`, which exists precisely because two
identical accessible names on one page is a defect this project has already
fixed once).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test components/auth`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
bun run test
bun run typecheck
bun run lint
git add components/auth lib/sync app/\[locale\]/cv/page.tsx
git commit -m "feat(auth): confirm to the user that their local CVs were claimed"
```

---

### Task 12: End-to-end guards, manual verification, and the docs

**Files:**
- Create: `e2e/auth.spec.ts`
- Modify: `README.md`
- Modify: `messages/no.json`, `messages/en.json` (beta copy)
- Create: `docs/superpowers/plans/2026-09-08-cvapp-accounts-verification.md`

This project's hardest-won lesson is that a green unit suite proves very
little about what a browser does. Real OAuth cannot run in Playwright without
a Google account and a headful browser, so the automated layer proves the
*absence* of regressions and the manual checklist proves the *presence* of
the feature. Do not skip the second half and report the feature as verified.

- [ ] **Step 1: Write the e2e guards**

```ts
// e2e/auth.spec.ts
import { expect, test } from '@playwright/test'

// The suite runs with no Supabase credentials, which is exactly the case
// worth guarding: accounts must never become a prerequisite for using CVApp.
test('the app is fully usable with auth switched off', async ({ page }) => {
  await page.goto('/no/cv')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /Logg inn/ })).toHaveCount(0)
})

test('the dashboard says where the CVs are stored', async ({ page }) => {
  await page.goto('/no/cv')
  await expect(page.getByText('Lagret bare på denne enheten')).toBeVisible()
})

test('the sign-in page explains itself rather than erroring', async ({ page }) => {
  await page.goto('/no/login')
  await expect(page.getByRole('heading', { name: 'Logg inn på CVApp' })).toBeVisible()
  await expect(page.getByText(/ikke slått på ennå/)).toBeVisible()
})

test('the auth endpoints are not locale-prefixed', async ({ page }) => {
  const response = await page.goto('/auth/callback')
  // Anything but a rewrite to /no/auth/callback. A redirect to the error page
  // is the correct behaviour for a callback with no code.
  expect(page.url()).not.toContain('/no/auth/callback')
  expect(response?.status()).toBeLessThan(500)
})

test('editing still works end to end with no account', async ({ page }) => {
  await page.goto('/no/templates')
  await page.getByRole('button', { name: /Bruk|Velg/ }).first().click()
  await page.getByLabel(/Fornavn|Navn/).first().fill('Testperson')
  await expect(page.locator('[data-cv-preview] .cv-doc')).toContainText('Testperson')
})
```

Run: `bun run test:e2e`
Expected: PASS, and the 37 existing tests still pass.

- [ ] **Step 2: Write the manual verification checklist**

Create `docs/superpowers/plans/2026-09-08-cvapp-accounts-verification.md`
with these checks, each to be ticked by a human against a real Supabase
project. They are ordered so that a failure stops the next one being
meaningful:

1. **Sign in claims local work.** Signed out, create two CVs. Sign in with
   Google. The banner names two CVs; the Supabase table editor shows two rows
   with your `user_id`.
2. **Second device pulls them.** Open the app in a private window, sign in as
   the same user. Both CVs appear. No duplicates.
3. **An edit propagates.** Rename a CV in window A. Within a few seconds,
   reload window B: the new name is there.
4. **A delete stays deleted.** Delete a CV in window A. Reload window B: it is
   gone, and it is still gone after another reload. (This is the tombstone
   test; without it the CV comes back.)
5. **Offline edits catch up.** In devtools, go offline. Edit a CV — the badge
   reads "Frakoblet". Go back online: the badge returns to "Lagret", and the
   row's `updated_at` moves.
6. **Sign-out leaves nothing behind.** Sign out. The dashboard is empty and
   the badge reads local-only. Sign in as a *different* Google account: that
   account sees only its own CVs.
7. **Another user cannot read yours.** With user B signed in, in the browser
   console: `await (await fetch('<project-url>/rest/v1/cv_documents?select=id', {headers:{apikey:'<publishable key>'}})).json()` returns an empty
   array, not user A's rows. This is the RLS check, and it is the one worth
   doing carefully.
8. **Account deletion really deletes.** On `/account`, delete the account.
   The Supabase dashboard shows no user and no `cv_documents` rows.
9. **Apple, if enabled.** Repeat check 1 on the deployed HTTPS domain with
   Sign in with Apple. Apple will not redirect to localhost.
10. **Mobile.** Repeat checks 1 and 3 on a phone-sized viewport. The header
    still fits with the account link in it.

- [ ] **Step 3: Update the beta copy**

The banner currently promises that local work comes with you. With accounts
live it should say how: add a sentence pointing at sign-in, in both
catalogues. Keep it to one sentence — the banner is already the busiest
element on the landing page.

- [ ] **Step 4: Update the README**

Add an "Accounts and sync" section covering: local-first with last-write-wins
on `updatedAt`; the app runs with no Supabase config; the environment
variables; where the migrations live and how they are applied; and the fact
that there is no service-role key by design. Add the new load-bearing rule to
the existing rules list:

> **Signing out clears the local store.** Documents on an account live on the
> server; leaving them in localStorage after sign-out hands them to whoever
> signs in next on that browser.

- [ ] **Step 5: Full verification and commit**

```bash
bun run test
bun run typecheck
bun run lint
bun run build
bun run test:e2e
git add e2e README.md messages docs
git commit -m "test(auth): guard the signed-out path and document accounts"
```

- [ ] **Step 6: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill. Do not merge
until the manual checklist in Step 2 has actually been run against a live
project — items 4, 6 and 7 in particular cannot fail safely.

---

## What this plan deliberately leaves out

- **Realtime.** Supabase Realtime would push changes between open tabs
  without a reload. The debounced sync plus a reload covers the actual use
  (one person, one device at a time), and Realtime is a subscription lifecycle
  to get wrong for a case nobody has hit yet.
- **Server-rendered CV lists.** The account page counts CVs from the local
  store, not from the database. Rendering the list server-side would mean two
  sources of truth for the same list and a visible flicker between them.
- **Payment.** The beta says free now, small charge later. Nothing here
  blocks it: a `plan` column on a future `profiles` table, or Stripe's own
  customer record keyed by `auth.users.id`, both fit without touching
  `cv_documents`.
- **Email/password and magic links.** More auth surface to secure (rate
  limiting, password reset, email deliverability) for an audience that
  already has a Google or Apple account.
- **Merging two accounts.** If someone signs in with Google having earlier
  used Apple, they get two accounts. Supabase can link identities; that is a
  real feature with its own edge cases and deserves its own plan if anyone
  actually asks.
