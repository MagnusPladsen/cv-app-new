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

### Four rules that are load-bearing

**1. No Tailwind inside `components/cv/**`.** The CV is styled entirely by
`public/cv/*.css`. The print iframe is a separate document and cannot see the
app's bundled stylesheet, so a Tailwind class here renders on screen and
vanishes from the exported PDF.

**2. All CV geometry in `mm`.** Paper, margins, page breaks. The screen and the
printed page have to agree.

**3. Two independent languages.** `lib/cv-labels` localizes the CV; `messages/`
localizes the app. A Norwegian UI can produce an English CV, which is the whole
point. Both are parity-checked by tests.

**4. Exactly one `.cv-doc` is ever mounted.** The export clones the first one it
finds, so the mobile preview switches layout on a real media query rather than
CSS visibility.

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

## Documentation

- `docs/superpowers/specs/` — the design spec
- `docs/superpowers/plans/` — the three implementation plans
