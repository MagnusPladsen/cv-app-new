# CVApp

A free CV builder. Unlimited CVs, unlimited watermark-free PDF downloads, no
account, no server. Norwegian and English, mobile first.

Every competitor either paywalls the download, caps you at one saved CV, caps
you at one page, or requires an account and a database. CVApp gives away the
thing they charge for.

## Running it

```bash
bun install
bun run dev            # http://localhost:3001 -> redirects to /no
```

| Script | What it does |
|---|---|
| `bun run dev` | Dev server on **port 3001** |
| `bun run build` / `bun run start` | Production build and serve |
| `bun run test` | Vitest: schema, store, renderers, forms |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run test:e2e` | Playwright: template snapshots and PDF export |
| `bun run test:e2e:update` | Re-baseline snapshots after an intentional design change |

Bun only — never `npm` or `yarn`.

## How it fits together

```
app/[locale]/            landing, template gallery, dashboard, editor
  preview/               developer proof sheet: every template, one CV
components/cv/           the CV document itself
  sections/              shared renderers, one per section type
  shells/                4 layouts: single column, sidebar L/R, header band
  templates/             9 templates: shell + tokens + swatches
components/editor/       the editing UI (Tailwind lives here)
lib/schema/              zod CvDocument, factories, migrations, demo fixture
lib/store/               Zustand store, pure mutators, undo/redo, JSON backup
lib/cv-labels/           CV *output* labels, separate from the app's UI strings
lib/print/               paper geometry, print HTML, the export pipeline
public/cv/               the CV's own CSS and self-hosted fonts
```

### Five rules that are load-bearing

**1. No Tailwind inside `components/cv/**`.** The CV is styled entirely by
`public/cv/*.css`. The print iframe is a separate document and cannot see the
app's bundled stylesheet, so a Tailwind class here renders on screen and
vanishes from the exported PDF.

**2. All CV geometry in `mm`.** Paper, margins, page breaks. The screen and the
printed page have to agree.

**3. Two independent languages.** `lib/cv-labels` localizes the CV; `messages/`
localizes the app. A Norwegian UI can produce an English CV, which is the whole
point. Both are parity-checked by tests.

**4. Exactly one `.cv-doc` lives inside `[data-cv-preview]`.** The export clones
that one. Thumbnails in the template strip and gallery render `.cv-doc` too, so
the marker is the contract; the mobile preview also switches layout on a real
media query rather than CSS visibility, so only one preview mounts at a time.

**5. Signing out clears the local store.** Documents on an account live on the
server, so leaving them in `localStorage` after sign-out hands them to whoever
signs in next on that browser. `adoptOwner` enforces the same rule in the other
direction: a different account signing in gets an empty store, never the
previous user's CVs.

### How export works

The preview *is* the print output. Exporting clones the live `.cv-doc` node into
a hidden same-origin iframe that links the same `public/cv` stylesheets, then
calls `print()`. One render, so preview and PDF cannot drift apart. The result is
real selectable text — an e2e test asserts the PDF embeds a font and contains no
image, which is what "ATS-safe" actually means.

## Adding a template

1. `components/cv/templates/<id>.ts` — pick a shell, an accent and swatches
2. `public/cv/templates/<id>.css` — scope everything to `.cv-doc--<id>`
3. Register it in `components/cv/templates/index.ts`
4. `bun run test` — the per-template matrix checks it automatically
5. `bun run test:e2e:update` — baseline its snapshot
6. Look at it on `/no/preview` before you commit

Sidebars take only short-form sections (`SIDEBAR_SAFE_SECTIONS`); anything with
long names wraps to one word per line in a 52 mm column.

## Testing

Vitest covers logic. Playwright covers what logic cannot see: layout, fonts,
page breaks and the actual PDF. The snapshot budget is `maxDiffPixels`, not a
ratio — a ratio scales with the image and silently passes a deleted border.

CI runs on Vercel.

The e2e suite runs with auth switched **on** and signed **out**, pointed at an
unroutable host. With no credentials the account link never renders, and a
header that overflows a phone once it appears would go unnoticed — which is
exactly what happened the day it was added.

Snapshots are position-sensitive: the proof sheet wraps, so adding or
reordering a template moves its neighbours to a different row and rounds their
bottom edge by a pixel. Before updating a snapshot you did not expect to
change, confirm the template's own files are untouched and that any new
stylesheet is scoped to its own `.cv-doc--<id>`.

## Beta

The app is free and fully usable. The header carries a Beta badge, the landing
page explains that a small charge will follow to cover server and database
costs, and the first download shows the same note plus an optional feedback box.

Feedback opens the user's mail client, so set a destination:

```bash
cp .env.example .env.local   # then fill in NEXT_PUBLIC_FEEDBACK_EMAIL
```

Without it the box says so rather than silently discarding what someone wrote.

## Accounts and sync

Optional, and off unless configured. With `NEXT_PUBLIC_SUPABASE_URL` unset the
app behaves exactly as it did before accounts existed: everything local, no
sign-in affordances anywhere.

The model is **local-first**. The Zustand store stays the source of truth the
editor reads and writes, so typing is instant and the app works offline and
signed out. When a session exists, a sync engine reconciles the store against
Supabase using last-write-wins on the `updatedAt` the editor already stamps.
Deletions are not special: they carry a timestamp like any other edit and lose
to anything newer, which is what makes "deleted on my phone, then kept editing
on my laptop" behave the way a person expects. Tombstones are why a delete on
one device is not resurrected by a stale copy on another.

There is no persisted dirty set. An unsynced change already carries a newer
`updatedAt` than the server's copy, so the next full merge finds it — which is
why the planner derives everything from timestamps.

- Conflict policy lives in `lib/sync/merge.ts`, is pure, and is where to add a
  test before changing any of the above.
- Migrations are in `supabase/migrations/`, applied through the dashboard SQL
  editor. RLS is enabled in the same migration that creates a table; a Supabase
  table without it is world-readable with the publishable key.
- Only the publishable key ever reaches this app. There is no service-role key,
  and account deletion is a `security definer` function rather than a reason to
  add one.
- `NEXT_PUBLIC_AUTH_PROVIDERS` is opt-in and empty by default. Having a
  Supabase project says nothing about which providers its dashboard has
  switched on, and a button that always errors is worse than no button.
- `/api/keep-alive` runs daily on Vercel cron so the free project is never
  paused for inactivity.

The signed-in half cannot be tested automatically — real OAuth needs a Google
account and a headful browser. Before trusting sync, work through
`docs/superpowers/plans/2026-09-08-cvapp-accounts-verification.md`.

## Documentation

- `docs/superpowers/specs/` — the design spec
- `docs/superpowers/plans/` — the implementation plans, and the manual
  verification checklist for accounts
