# CVApp Templates and Polish Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the remaining eight templates across four layout shells, a template gallery that is the front door for a new CV, the landing page, and the vibrant playful chrome pass — with every template verified by eye in a real browser, not only by assertion.

**Architecture:** Four shells (`SingleColumn` exists; `SidebarLeft`, `SidebarRight`, `HeaderBand` are new) consume the shared section renderers already in `components/cv/sections/`. Each template is a `Template` record: shell + token overrides + swatches + `levelDisplay`, with an `overrides` escape hatch for the one creative template that needs bespoke markup. Template-specific CSS lives in `public/cv/templates/<id>.css`, loaded by both the preview and the print iframe through `CV_STYLESHEETS`.

**Tech Stack:** As Plans 1 and 2. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-02-cvapp-design.md`
**Predecessors:** `2026-09-02-cvapp-foundation.md`, `2026-09-02-cvapp-editor.md` (both complete)

## Global Constraints

All Plan 1 and Plan 2 constraints still apply. Load-bearing ones here:

- **No Tailwind inside `components/cv/**`.** Template markup uses plain CSS
  classes only. A Tailwind class here silently vanishes from the PDF.
- **All CV geometry in `mm`** (or `pt` for type). Never `px`.
- **Template CSS is served from `public/cv/`** and registered so the print
  iframe loads it. A template styled by a bundled stylesheet will render
  correctly on screen and unstyled in the exported PDF.
- **Label parity** in `messages/*.json`, test-enforced.
- **Verification runs unpiped:** `bun run test`, `bun run typecheck`,
  `bun run lint` as bare commands.

### New constraint: every template is looked at

A template that passes its tests but looks wrong is a failed template. **Each
template task ends with a browser screenshot reviewed by eye**, using a fully
populated fixture CV — not an empty one, which hides every layout problem.

```bash
superset browser open --workspace "$SUPERSET_WORKSPACE_ID" \
  --url http://localhost:3000/no/cv --target new-tab --json
superset browser screenshot --workspace "$SUPERSET_WORKSPACE_ID" \
  --pane <paneId> --out shot.png
```

Wrap every `eval` snippet in an IIFE; bare statements are rejected.

---

### Task 1: A seeded demo CV for looking at templates

**Files:**
- Create: `lib/schema/demo.ts`
- Create: `app/[locale]/preview/page.tsx` — a dev-only template proof sheet
- Test: `lib/schema/__tests__/demo.test.ts`

**Interfaces:**
- Produces: `createDemoDocument(overrides?, deps?): CvDocument` — a realistic, fully populated Norwegian CV that fills roughly one and a half A4 pages
- Produces: a route rendering the demo CV in **every** registered template, side by side

**Why this comes first.** Every later task ends with "look at it". Looking
requires content: an empty CV hides column balance, page breaks, long-name
wrapping and sidebar overflow. One seeded fixture, reused by every template
task and by the tests, makes the comparisons meaningful and fair.

The demo must include: a long name, a two-line job title, five contact fields,
three links, a summary of ~40 words, three experience entries with three
bullets each, two education entries, eight skills with mixed levels, three
languages, two certifications, six interests, and one referee. That is enough
to overflow one page, which is what exposes page-break bugs.

- [ ] **Step 1: Write the failing test**

`lib/schema/__tests__/demo.test.ts` asserts the demo document parses against
`cvDocumentSchema`; that every section type in `SECTION_TYPES` except `custom`
is present and enabled; that experience has at least three entries and each has
a multi-line description; that skills include both a levelled and an unlevelled
item; and that languages include `native` and at least one CEFR level. Also
assert it is deterministic given fixed `FactoryDeps`.

- [ ] **Step 2: Run to verify failure, then write `createDemoDocument`**

Build it on `createEmptyDocument` and the Task 1 mutators from Plan 2, so it
cannot drift from the real shapes.

- [ ] **Step 3: Add the proof-sheet route**

`app/[locale]/preview/page.tsx` renders `<CvDocument>` once per entry in
`TEMPLATES`, each labelled with the template name, in a scrollable grid at
~45% scale. This is the page every later task screenshots.

- [ ] **Step 4: Look at it**

Open `/no/preview`, screenshot, confirm the single existing template renders
the demo CV legibly and overflows onto a second page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cv): add a seeded demo CV and a template proof sheet"
```

---

### Task 2: Template stylesheet registration

**Files:**
- Modify: `lib/print/stylesheets.ts`
- Modify: `components/cv/CvDocument.tsx`
- Modify: `components/editor/ExportButton.tsx`
- Modify: `app/[locale]/layout.tsx`
- Test: `lib/print/__tests__/stylesheets.test.ts`

**Interfaces:**
- Produces:
  - `templateStylesheet(templateId: string): string` — `/cv/templates/<id>.css`
  - `ALL_TEMPLATE_STYLESHEETS: readonly string[]` — every registered template's sheet, for the layout to preload
  - `CV_STYLESHEETS` unchanged as the shared base
- `ExportButton` passes `extraStylesheets: [templateStylesheet(document.theme.templateId)]` to `printCvNode`

**This is the task that keeps the PDF correct.** `printCvNode` already accepts
`extraStylesheets` but nothing passes any, so a template styled by its own sheet
would look right on screen and unstyled in the export. Wire it before writing
any template CSS, not after.

- [ ] **Step 1: Write the failing test**

Extend `stylesheets.test.ts` to assert: `templateStylesheet('oslo')` is
`/cv/templates/oslo.css`; every id in `TEMPLATES` has a file that exists on
disk under `public/`; none of those files contains `@import`; and
`ALL_TEMPLATE_STYLESHEETS` has one entry per template.

Add a case to `lib/print/__tests__/export-integration.test.tsx` asserting the
built print HTML links the active template's stylesheet after `/cv/base.css`.

- [ ] **Step 2: Implement, creating an empty `public/cv/templates/oslo.css`**

Oslo needs no extra CSS today; the file exists so the contract holds uniformly
and the test has something to find.

- [ ] **Step 3: Run, verify, commit**

```bash
git add -A
git commit -m "feat(print): load per-template stylesheets in the preview and the export"
```

---

### Task 3: The three remaining layout shells

**Files:**
- Create: `components/cv/shells/SidebarLeft.tsx`
- Create: `components/cv/shells/SidebarRight.tsx`
- Create: `components/cv/shells/HeaderBand.tsx`
- Modify: `components/cv/CvDocument.tsx`
- Modify: `public/cv/base.css`
- Test: `components/cv/__tests__/shells.test.tsx`

**Interfaces:**
- Each shell takes `{ header, sections, sidebar }` where `sidebar` is the
  rendered subset named by `Template.sidebarSections`
- `CvDocument` splits sections into main and sidebar groups by
  `template.sidebarSections`, preserving document order within each group
- New base classes: `.cv-shell--sidebar`, `.cv-shell__aside`, `.cv-shell__main`,
  `.cv-shell--band`, `.cv-band`

**Behaviour that must be tested, because it is easy to get wrong:**

- A section named in `sidebarSections` renders in the aside and **not** in main.
- A section not named renders in main only. No section renders twice — assert
  the section title appears exactly once in the whole document.
- A sidebar template with an empty `sidebarSections` renders everything in main.
- `HeaderBand` renders the personalia header inside `.cv-band` and every section
  below it.
- Sidebar column widths are in `mm`, so the printed page matches.

- [ ] **Step 1: Write the failing test**, covering each bullet above with the
demo document.

- [ ] **Step 2: Write the shells and their base CSS**

`.cv-shell--sidebar` is a flex row: aside at a fixed `mm` width, main takes the
rest, with `gap` scaled by `--cv-scale`. `SidebarRight` reverses the order.
`.cv-band` is a full-bleed block using `--cv-accent` and `--cv-accent-ink`,
which is exactly why `pickInk` exists.

- [ ] **Step 3: Split sections in `CvDocument`**

- [ ] **Step 4: Run, verify, look at it, commit**

Register a throwaway sidebar template locally to screenshot the shell, or wait
for Task 4 — but do not commit without having seen a sidebar render.

```bash
git add -A
git commit -m "feat(cv): add sidebar and header-band layout shells"
```

---

### Tasks 4-11: The eight templates

Each of these eight tasks follows the identical shape. They are listed
individually so each gets its own review gate, but the steps are the same:

1. **Write the failing test** in `components/cv/__tests__/templates.test.tsx`:
   the template is registered; its `defaultAccent` is one of its `swatches`;
   its shell is the intended one; and, for sidebar templates, its
   `sidebarSections` are all real `SectionType` values.
2. **Write `components/cv/templates/<id>.ts`** and
   `public/cv/templates/<id>.css`.
3. **Register it** in `components/cv/templates/index.ts`.
4. **Run** `bun run test`, `bun run typecheck`, `bun run lint`.
5. **Look at it**: screenshot `/no/preview` and review the template rendering
   the demo CV. Check specifically: the name does not wrap awkwardly, the
   sidebar does not overflow, section titles align, the second page is not
   orphaned, and the accent reads against the background.
6. **Commit.**

| Task | id | Shell | Character | Sidebar sections |
|---|---|---|---|---|
| 4 | `bergen` | single | Modern: accent section titles, small-caps labels, generous whitespace | — |
| 5 | `kompakt` | single | Dense two-line entry headers; fits a long career on one page | — |
| 6 | `akademisk` | single | Serif, classic, publication-friendly | — |
| 7 | `fjord` | sidebar-left | Tinted sidebar, photo at top | skills, languages, interests, drivingLicence |
| 8 | `nord` | sidebar-right | Light sidebar, hairline dividers | skills, languages, certifications |
| 9 | `trondheim` | header-band | Accent band with a round photo | — |
| 10 | `aurora` | header-band | Gradient header, bold display type | — |
| 11 | `studio` | sidebar-left | Creative: asymmetric, accent shapes, oversized name; uses the `overrides` hook for a bespoke header | skills, languages, interests |

**`akademisk` and `aurora` need font pairings that do not exist yet.** Before
those tasks, vendor the faces into `public/fonts/`, add the `@font-face` rules
to `public/cv/fonts.css`, and add the pair to `FONT_PAIRS` in
`lib/theme/fonts.ts` — following exactly the pattern Plan 1 Task 11 used for
Inter (`bun add @fontsource-variable/<name>`, copy the woff2, declare the face
with its unicode-range). A pairing referenced by a template but absent from
`fonts.css` renders as a system fallback in the PDF only, which is the hardest
class of bug to notice.

Suggested pairings: `akademisk` → Libre Baskerville + Source Sans 3;
`aurora` → Inter Tight + Inter.

---

### Task 12: Template gallery and template-first onboarding

**Files:**
- Create: `components/gallery/TemplateCard.tsx`
- Create: `app/[locale]/templates/page.tsx`
- Modify: `app/[locale]/cv/page.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/gallery/__tests__/gallery.test.tsx`

**Interfaces:**
- `TemplateCard({ template, onChoose })` — a scaled thumbnail of the demo CV in
  that template, its name, and a choose action
- `/[locale]/templates` lists every template; choosing one creates a CV with
  that `templateId` and its `defaultAccent`, then navigates to the editor
- The dashboard's "Ny CV" routes to the gallery rather than creating blank

**Onboarding decision, from the spec:** the gallery is the front door. Choosing
a template is step one, then the editor. JSON import stays a first-class
alternative on the dashboard.

- [ ] **Step 1: Write the failing test**

Assert: one card per registered template; each card renders a `.cv-doc`
thumbnail; choosing calls `onChoose` with the template id; and the gallery
renders exactly one `.cv-doc` per template and no more.

- [ ] **Step 2: Write the components and the route, add message keys**

Thumbnails reuse `CvDocument` with the demo document at a small scale inside a
`transform: scale()` wrapper, matching how `PreviewPane` isolates scale.

- [ ] **Step 3: Run, verify, look at the gallery, commit**

---

### Task 13: Landing page and the playful chrome pass

**Files:**
- Modify: `app/[locale]/page.tsx`
- Modify: `app/globals.css`
- Create: `components/chrome/AppHeader.tsx`
- Modify: `app/[locale]/layout.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/chrome/__tests__/app-header.test.tsx`

**The brief, from the spec:** vibrant playful — saturated gradient accents,
large radii, springy micro-interactions, light and dark. **The CV templates stay
strictly professional; the personality lives in the app around them.**

- `AppHeader`: wordmark, a locale switcher that swaps `/no` ⟷ `/en` preserving
  the current path (use `usePathname` from `@/i18n/navigation`), and a link to
  the gallery.
- Landing: an oversized gradient headline, the honest pitch — free, no account,
  no watermark, works on your phone — a primary call to action into the gallery,
  and a strip of template thumbnails.
- Dark mode: define the palette as tokens on `:root` and redefine them under
  `@media (prefers-color-scheme: dark)`. **The `.cv-doc` surface must stay white
  in both**, because it is paper.

- [ ] **Step 1: Write the failing test** for `AppHeader`: it renders the
wordmark; the locale switcher links to the same path under the other locale;
and the current locale is marked `aria-current`.

- [ ] **Step 2: Build the header, landing page and token palette**

- [ ] **Step 3: Verify the CV surface stays white in dark mode**

Add a test asserting `--cv-surface` resolves to white regardless of theme, and
confirm by screenshotting the editor with the pane in dark mode.

- [ ] **Step 4: Run, verify, look at it, commit**

---

### Task 14: Mobile export hint

**Files:**
- Create: `components/editor/ExportHint.tsx`
- Modify: `components/editor/ExportButton.tsx`
- Modify: `messages/no.json`, `messages/en.json`
- Test: `components/editor/__tests__/export-hint.test.tsx`

**Interfaces:**
- `ExportHint({ open, onDismiss })` — shown once, the first time a mobile user
  exports, using the existing `editor.exportHintMobile` message
- Dismissal is remembered in `localStorage` under `cvapp:export-hint-seen:v1`

**Why it exists.** On iOS the print path surfaces as the share sheet, then Save
to Files. That is the accepted trade-off recorded in the spec's risk list; the
hint is the mitigation. Without it a mobile user taps Download PDF, sees a share
sheet, and concludes the app is broken.

- [ ] **Step 1: Write the failing test**: the hint shows on a mobile-width first
export; it does not show on desktop; it does not show again once dismissed; and
a storage read that throws (private browsing) is treated as "not yet seen"
rather than crashing.

- [ ] **Step 2: Implement, run, verify, commit**

---

## What Plan 3 delivers

Nine templates across four shells, each one looked at rendering a realistic CV;
a gallery that is the front door; a landing page that states the pitch; the
playful chrome; and an honest mobile export experience.

## Self-review

**Spec coverage.** Plan 3 closes every remaining item from the spec's build
order: the eight remaining templates and four shells (Tasks 3-11), the template
gallery and template-first onboarding (Task 12), the landing page and chrome
pass (Task 13), the mobile export hint (Task 14), and the remaining font
pairings (folded into Tasks 6 and 10, where they are first needed).

**Sequencing check.** Task 2 wires per-template stylesheets *before* any
template CSS exists, because a template styled by an unregistered sheet renders
correctly on screen and unstyled in the PDF — the failure mode this whole
architecture exists to prevent. Task 1 comes first because every subsequent
task's review gate needs realistic content to review.

**Type consistency.** `Template` is unchanged from
`components/cv/types.ts`; the shells consume `sidebarSections?: SectionType[]`
exactly as declared there. `templateStylesheet` returns the same string shape
`printCvNode` already accepts in `extraStylesheets`.

**Known risk.** Eight templates is a lot of CSS with no visual regression
harness. The per-task screenshot gate is the mitigation, and it is manual. If
templates start breaking silently, adding Playwright snapshots is the first
thing to do — this is the third plan in a row to record that.
