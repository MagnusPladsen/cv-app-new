# CVApp — Design Spec

**Date:** 2026-09-02
**Status:** Approved design, ready for implementation planning

## 1. Purpose

A genuinely free CV builder. Every competitor either paywalls the download
(Resume.io), caps you at one saved CV (FlowCV), caps you at one page
(Novoresume), or requires an account and a database (Reactive Resume).

CVApp gives away the thing they charge for: unlimited CVs, unlimited
watermark-free PDF downloads, no account, no server. It is Norwegian-native
and English-native from day one, and it is built mobile-first.

### Success criteria

1. A user lands on the site and downloads a finished, good-looking PDF without
   creating an account, paying, or seeing a watermark.
2. The whole flow works on a phone.
3. A CV can be written in Norwegian or English independently of the app's UI
   language.
4. Nine templates, each of which a person would be happy to send to an employer.
5. CVs survive a browser refresh, and can be exported to a file as insurance.

### Non-goals for v1

- Cover letters
- AI writing assistance
- User accounts and cloud sync (the data model is designed so these can be
  added later without migration pain)
- Public shareable links
- Convention coaching per locale (labels are translated; defaults are not
  changed per language)

## 2. Product decisions

| Decision | Choice |
|---|---|
| UI language | `next-intl`, locale in the URL (`/no`, `/en`). Adding a language = one message file. |
| CV language | Stored **per document**, resolved via a separate label dictionary. A Norwegian UI can produce an English CV. |
| Number of CVs | Unlimited, with duplicate-to-tailor |
| Persistence | localStorage, autosaved, versioned schema with migrations |
| PDF export | Browser print CSS via an isolated iframe. No server. |
| Mobile export | Print path plus a first-run illustrated hint for iOS/Android |
| Paper | A4 default, Letter selectable per document. Multi-page with page-break guides and a page counter. |
| Photo | Supported, **on by default**, downscaled and compressed before storage |
| Localization depth | Labels only. Field sets and defaults are identical across languages. |
| Onboarding | Template gallery first, then the editor. JSON import is a first-class alternative entry point. |
| App chrome | Vibrant playful: saturated gradient accents, large radii, springy micro-interactions, light and dark |
| Desktop editor | Split view — form left, live A4/Letter page right |
| Mobile editor | Full editing, live preview in a draggable bottom sheet |
| Testing | Vitest + React Testing Library. No Playwright in v1. |

## 3. Architecture

```
app/[locale]/
  page.tsx                    landing
  templates/page.tsx          template gallery (also the "new CV" entry point)
  cv/page.tsx                 dashboard — CV cards, duplicate, rename, delete, import
  cv/[id]/page.tsx            editor

lib/schema/                   zod CvDocument, defaults, versioned migrations
lib/store/                    Zustand stores + zundo temporal (undo/redo)
lib/cv-labels/                CV-output dictionaries (no.ts, en.ts) — separate from UI i18n
lib/print/                    iframe print pipeline, filename, page measurement
lib/image/                    client-side photo downscale + compression

components/editor/            section forms, drag lists, design panel, preview sheet
components/cv/
  shells/                     SingleColumn, SidebarLeft, SidebarRight, HeaderBand
  sections/                   shared section renderers
  templates/                  9 template definitions (shell + tokens + overrides)
  CvDocument.tsx              resolves template -> shell, renders the ordered section stack
```

### Template engine

Nine templates are only affordable because they are not nine independent React
trees. Each template is:

```ts
type Template = {
  id: string
  shell: 'single' | 'sidebar-left' | 'sidebar-right' | 'header-band'
  tokens: ThemeTokens              // CSS custom properties
  swatches: string[]               // curated accents for this template
  sidebarSections?: SectionType[]  // for sidebar shells
  overrides?: Partial<SectionRenderers>  // escape hatch for creative templates
}
```

Shared section renderers do the work; the shell does the layout; tokens do the
styling. A creative template that needs a bespoke header overrides only that
renderer.

**The nine templates:**

| id | Shell | Character |
|---|---|---|
| `oslo` | single | Strict ATS. Black ink, accent only on rules. Skill levels render as **text**, not bars. |
| `bergen` | single | Modern: accent section titles, small-caps labels, generous whitespace |
| `trondheim` | header-band | Accent header band with a round photo |
| `fjord` | sidebar-left | Tinted sidebar, photo at top |
| `nord` | sidebar-right | Light sidebar, hairline dividers |
| `aurora` | header-band | Gradient header, bold display type |
| `kompakt` | single | Dense two-line entry headers — fits a long career on one page |
| `akademisk` | single | Serif, classic, publication-friendly |
| `studio` | sidebar-left | Creative: asymmetric, accent shapes, oversized name |

### Theming

Every template consumes the same custom properties:

`--accent`, `--accent-ink` (auto-computed for WCAG contrast, so a pale accent
never yields unreadable text on an accent fill), `--ink`, `--muted`, `--rule`,
`--surface`, `--scale`, `--font-head`, `--font-body`.

- **Colour:** curated swatches per template + a full colour picker
- **Density:** compact `0.92` / normal `1.0` / roomy `1.08`, applied as `--scale`
  to font sizes and section gaps
- **Font pairings:** five print-safe pairs, self-hosted via `next/font` —
  Inter + Inter Tight; Source Serif 4 + Inter; Lora + Lato; IBM Plex
  Sans + IBM Plex Serif; Libre Baskerville + Source Sans 3

## 4. Data model

```ts
type CvDocument = {
  id: string
  schemaVersion: number
  name: string                       // "Frontend, Oslo" — the user's own label
  language: 'no' | 'en'              // CV output language
  paper: 'a4' | 'letter'
  updatedAt: number
  theme: {
    templateId: string
    accent: string
    fontPairId: string
    density: 'compact' | 'normal' | 'roomy'
  }
  personalia: {
    firstName, lastName, title
    email, phone, city, country
    birthDate?: string
    photo?: { dataUrl: string }      // compressed
    showPhoto: boolean
    links: { id, label, url }[]
  }
  sections: Section[]                // ordered; drag to reorder
}

type SectionBase = {
  id: string
  enabled: boolean
  titleOverride?: string             // per-CV rename
}

type Section = SectionBase & (
  | { type: 'summary';     text: string }
  | { type: 'experience' | 'education' | 'projects' | 'volunteering' | 'courses'
      entries: TimelineEntry[] }
  | { type: 'skills';    items: SkillItem[] }
  | { type: 'languages'; items: LanguageItem[] }
  | { type: 'certifications';         entries: CertEntry[] }
  | { type: 'references';             entries: ReferenceEntry[] }
  | { type: 'interests';              items: string[] }
  | { type: 'drivingLicence';         classes: string[]; note?: string }
  | { type: 'custom'; title: string
      shape: 'entries' | 'bullets' | 'text'
      entries?: TimelineEntry[]; bullets?: string[]; text?: string }
)

type TimelineEntry = {
  id: string
  role: string; organisation: string; location?: string
  from: string; to: string; current: boolean
  description?: string               // optional but prompted
  descriptionMode: 'bullets' | 'prose'   // per-entry toggle
}

type SkillItem    = { id: string; name: string; level?: SkillLevel }
type LanguageItem = { id: string; name: string; level?: LanguageLevel }

type SkillLevel    = 1 | 2 | 3 | 4 | 5
type LanguageLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'native'
```

### Section catalogue

- **Always on:** Personalia (with the links row)
- **Core:** Summary, Work experience, Education, Skills, Languages,
  Certifications, References, Interests
- **Optional:** Projects, Volunteering, Courses, Driving licence
- **Custom:** user-named, one of three shapes — entries, bullets, or free text

Every section can be toggled off, reordered by drag, and renamed per CV.
Entries within a section can also be reordered by drag.

### Descriptions

`description` is a plain textarea — no rich-text dependency — with a per-entry
`descriptionMode` toggle:

- **bullets** (default): each non-empty line renders as a proper `<li>`
- **prose**: renders as a paragraph with line breaks preserved

The field is optional, but the form actively prompts for it, since an entry
without achievements is the most common weak point in a CV.

### Skill and language levels

A 5-step scale, optional per item, with words localized to the CV language:

| Level | English | Norwegian |
|---|---|---|
| 1 | Beginner | Nybegynner |
| 2 | Basic | Grunnleggende |
| 3 | Intermediate | Middels |
| 4 | Advanced | Avansert |
| 5 | Expert | Ekspert |

Languages use a separate 7-step scale — A1, A2, B1, B2, C1, C2, Native /
Morsmål — because CEFR levels are what employers recognise and they do not map
cleanly onto the 5-step skill scale.

**Rendering:** a segmented bar whose fill is the level's position within *its
own* scale, so a 5-step skill and a 7-step language level render as comparable
bars. The level word is always present as accessible text. `oslo`, the
strict-ATS template, renders the word instead of the bar, because a bar carries
no meaning to a résumé parser.

## 5. State and persistence

- **Zustand** with the `persist` middleware to localStorage, key
  `cvapp:documents:v1`, debounced ~400 ms
- **`zundo`** temporal middleware for undo/redo (Cmd/Ctrl+Z), history capped,
  with keystroke grouping so one word isn't 20 undo steps
- **`schemaVersion` + `migrate()`** chain on load, so a future field never
  destroys a saved CV
- **Backup:** "Download .json" and "Restore from file", validated through zod on
  import; unknown or malformed input is rejected with a readable error
- **Quota guard:** `QuotaExceededError` is caught and surfaced as "your storage
  is full — export a backup and remove an old CV", which matters because photos
  are on by default
- **Photos** are downscaled (max ~600 px on the long edge) and re-encoded before
  they ever reach the store
- **Hydration:** localStorage is client-only, so routes that read documents
  render a skeleton until mounted, avoiding a hydration mismatch

No form library. Inputs bind to the store through granular selectors; the
preview subscribes narrowly and each section renderer is memoised, so typing in
one field does not re-render the whole document. zod is used for import
validation, not per-keystroke validation.

## 6. Print pipeline

The preview and the PDF must be the same render, or they will drift.

1. `CvDocument` renders into a surface with the paper's exact width in `mm`.
   On screen a `transform: scale(k)` fits it to the pane; the transform never
   touches the print path.
2. Export builds the same markup into a **same-origin hidden iframe** carrying
   only the template CSS, then calls `iframe.contentWindow.print()`. App chrome,
   Tailwind resets and dark mode cannot bleed into the output.
3. `@page { size: A4 | Letter; margin: 0 }`, all template geometry in `mm`,
   `break-inside: avoid` on entries, `break-after: avoid` on section titles.
4. `document.fonts.ready` is awaited before printing, and the iframe title is
   set to e.g. `Ola_Nordmann_CV` so the browser suggests a sensible filename.
5. On screen, dashed **page-break guides** are drawn from measured content
   height, with a page-count badge — so a user knows they are on page 2 before
   they hit print.

Output is real selectable text: ATS-parseable, zero server cost, works offline.

**Mobile:** the same path. On iOS this surfaces as the share sheet → Save to
Files, and on Android as Chrome's print dialog. A one-time illustrated hint
explains this the first time a mobile user exports.

## 7. UI

**Desktop editor** — form left, live page right, zoom control under the page,
fullscreen preview button. A section list at the top of the form column handles
drag-reorder, enable/disable and "add section".

**Mobile editor** — full editing in a single column, sticky bottom bar with
Preview / Design / Export. Preview raises a draggable bottom sheet with the live
page; drag it down to keep typing.

**Design panel** — template picker, accent swatches + colour picker, font
pairing, density, paper size.

**Dashboard** — CV cards with a live thumbnail, last-edited time, and duplicate
/ rename / delete / export.

**Chrome** — vibrant playful: gradient accents, large radii, springy
micro-interactions, light and dark themes. The CV templates themselves stay
strictly professional; the personality lives in the app around them.

**Accessibility** — keyboard-operable drag-reorder (not pointer-only), labelled
inputs, visible focus, and an automatic contrast check on the chosen accent.

**Privacy** — no analytics, no tracking, no third-party requests at runtime.
Fonts are self-hosted. This is a feature, and it is stated on the landing page.

## 8. Stack

- Bun, Next.js 15 App Router, TypeScript strict
- Tailwind v4, shadcn/ui
- Zustand + zundo, zod, next-intl, dnd-kit
- **No TanStack Query** — there is no server to query
- Vitest + React Testing Library for schema, migrations, label dictionaries,
  the store and the section renderers
- Target deployment: static export on a free host

## 9. Risks

1. **Preview ↔ print drift.** Mitigated by the shared render, the isolated
   iframe and `mm` units; never fully eliminated across browsers. Highest-value
   thing to test manually before launch.
2. **Mobile PDF export UX.** Functional but not delightful on iOS. Accepted for
   v1; the template layer stays server-render-ready so a headless-Chromium route
   can be added later without touching templates.
3. **Nine templates is the largest single chunk of work.** The four-shell
   architecture is what makes it survivable.
4. **No Playwright means template regressions are caught by eye.** Accepted
   trade-off. A visual snapshot harness is the first thing to add if templates
   start breaking silently.
5. **localStorage with photos on by default.** Compression plus the quota guard
   plus JSON backup are the mitigation.

## 10. Build order

1. Schema, store, persistence, migrations, undo/redo — with tests
2. Print pipeline and one template (`oslo`), proving the export path end to end
3. Editor shell: split view, section forms, drag-reorder
4. Design panel: theming tokens, colour, fonts, density, paper
5. Remaining eight templates across the four shells
6. Dashboard, import/export, template gallery, onboarding
7. i18n pass (UI + CV label dictionaries), landing page, mobile polish
