# CVApp Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of CVApp up to a working vertical slice — create a CV, edit personalia and work experience, see it render live in a real A4/Letter page, and export a genuine selectable-text PDF via the browser print dialog.

**Architecture:** A fully client-side Next.js 15 App Router app. A versioned `CvDocument` zod schema is held in a Zustand store persisted to localStorage with undo/redo. CV rendering is split into shared section renderers + layout shells + per-template theme tokens, styled by plain CSS in `public/cv/` (never Tailwind) so the exact same markup and stylesheets can be cloned into a hidden print iframe. App chrome uses Tailwind v4 + shadcn/ui.

**Tech Stack:** Bun, Next.js 15 (App Router), TypeScript strict, Tailwind v4, shadcn/ui, Zustand, zundo, immer, zod, next-intl, Vitest, React Testing Library, happy-dom.

**Spec:** `docs/superpowers/specs/2026-09-02-cvapp-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Package manager is Bun.** Never run `npm` or `yarn`. Install with `bun add`, run scripts with `bun run`.
- **TypeScript strict.** `tsconfig.json` keeps `"strict": true`. No `any` in committed code except where explicitly shown in this plan (migration input, which is genuinely unknown).
- **No Tailwind inside `components/cv/**`.** CV template markup uses plain CSS class names defined in `public/cv/*.css`. Tailwind is for app chrome only. A Tailwind utility class inside a CV component is a bug — it will silently vanish in the exported PDF.
- **All CV geometry in `mm`.** Paper sizes, margins, page breaks. Never `px` in CV layout CSS.
- **No third-party runtime requests.** No analytics, no CDN fonts, no tracking. Fonts are self-hosted in `public/fonts/`.
- **Label parity.** Every key in `lib/cv-labels/en.ts` must exist in `lib/cv-labels/no.ts` and vice versa. This is enforced by a test.
- **Schema changes require a migration.** Bumping `CURRENT_SCHEMA_VERSION` without adding an entry to `migrations` and a test is a bug.
- **Paper sizes:** A4 = 210 × 297 mm. Letter = 215.9 × 279.4 mm.
- **localStorage keys** are namespaced `cvapp:` — this plan uses `cvapp:documents:v1`.
- **Skill levels** are `1|2|3|4|5`. **Language levels** are `'a1'|'a2'|'b1'|'b2'|'c1'|'c2'|'native'`. These are different scales and must not be unified.

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/globals.css` (via scaffold)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `lib/app-meta.ts`
- Create: `.gitignore` (via scaffold)
- Test: `lib/__tests__/app-meta.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a working `bun run test` command; `APP_NAME: string` exported from `lib/app-meta.ts`; the `@/*` import alias resolving to the repo root.

- [ ] **Step 1: Scaffold Next.js into a temp directory**

`create-next-app` refuses to run in a directory containing `docs/`, so scaffold elsewhere and copy in.

```bash
rm -rf /tmp/cvapp-scaffold && mkdir -p /tmp/cvapp-scaffold
cd /tmp/cvapp-scaffold
bunx create-next-app@latest cvapp \
  --ts --tailwind --app --no-src-dir \
  --import-alias "@/*" --eslint --use-bun --turbopack --yes
```

- [ ] **Step 2: Copy the scaffold into the repo**

```bash
cd /Users/magnuspladsen/git/cv-app-new
rsync -a --exclude='.git' --exclude='README.md' /tmp/cvapp-scaffold/cvapp/ ./
rm -rf /tmp/cvapp-scaffold
bun install
```

- [ ] **Step 3: Verify the app builds and boots**

Run: `bun run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Install runtime and test dependencies**

```bash
bun add zustand zundo immer zod next-intl @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
bun add -d vitest @vitejs/plugin-react vite-tsconfig-paths happy-dom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 5: Initialise shadcn/ui**

```bash
bunx --bun shadcn@latest init -d
```

Expected: creates `components.json` and `lib/utils.ts`. If it prompts, accept defaults (New York style, neutral base colour, CSS variables enabled).

- [ ] **Step 6: Write the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 7: Add test scripts**

Edit `package.json` and add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 8: Write the failing test**

Create `lib/__tests__/app-meta.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { APP_NAME, STORAGE_PREFIX } from '@/lib/app-meta'

describe('app metadata', () => {
  it('exposes the application name', () => {
    expect(APP_NAME).toBe('CVApp')
  })

  it('namespaces localStorage keys', () => {
    expect(STORAGE_PREFIX).toBe('cvapp:')
  })
})
```

- [ ] **Step 9: Run the test to verify it fails**

Run: `bun run test`
Expected: FAIL — `Failed to resolve import "@/lib/app-meta"`.

- [ ] **Step 10: Write the minimal implementation**

Create `lib/app-meta.ts`:

```ts
export const APP_NAME = 'CVApp'
export const STORAGE_PREFIX = 'cvapp:'
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `bun run test`
Expected: PASS — 2 tests.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Bun, Tailwind v4, shadcn and Vitest"
```

---

### Task 2: CvDocument schema

**Files:**
- Create: `lib/schema/cv.ts`
- Test: `lib/schema/__tests__/cv.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `CURRENT_SCHEMA_VERSION: number`; zod schemas `cvDocumentSchema`, `sectionSchema`, `personaliaSchema`, `themeSchema`, `timelineEntrySchema`, `skillItemSchema`, `languageItemSchema`; types `CvDocument`, `Section`, `SectionType`, `CvLanguage`, `PaperId`, `Density`, `SkillLevel`, `LanguageLevel`, `TimelineEntry`, `SkillItem`, `LanguageItem`, `Personalia`, `CvTheme`; constant `SECTION_TYPES: readonly SectionType[]`.

- [ ] **Step 1: Write the failing test**

Create `lib/schema/__tests__/cv.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  SECTION_TYPES,
  cvDocumentSchema,
  sectionSchema,
} from '@/lib/schema/cv'

const validDocument = {
  id: 'doc-1',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: 'Frontend, Oslo',
  language: 'no',
  paper: 'a4',
  updatedAt: 1_700_000_000_000,
  theme: {
    templateId: 'oslo',
    accent: '#2563eb',
    fontPairId: 'inter',
    density: 'normal',
  },
  personalia: {
    firstName: 'Ola',
    lastName: 'Nordmann',
    title: 'Frontendutvikler',
    email: 'ola@example.no',
    phone: '+47 900 00 000',
    city: 'Oslo',
    country: 'Norge',
    showPhoto: true,
    links: [{ id: 'l1', label: 'GitHub', url: 'https://github.com/ola' }],
  },
  sections: [
    { id: 's1', type: 'summary', enabled: true, text: 'Hei.' },
    {
      id: 's2',
      type: 'experience',
      enabled: true,
      entries: [
        {
          id: 'e1',
          role: 'Utvikler',
          organisation: 'Acme AS',
          from: '2022-01',
          to: '',
          current: true,
          description: 'Ledet team\nKuttet lastetid',
          descriptionMode: 'bullets',
        },
      ],
    },
  ],
}

describe('cvDocumentSchema', () => {
  it('accepts a valid document', () => {
    const result = cvDocumentSchema.safeParse(validDocument)
    expect(result.success).toBe(true)
  })

  it('rejects an unknown CV language', () => {
    const result = cvDocumentSchema.safeParse({ ...validDocument, language: 'de' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown paper size', () => {
    const result = cvDocumentSchema.safeParse({ ...validDocument, paper: 'a3' })
    expect(result.success).toBe(false)
  })

  it('requires personalia to declare photo visibility', () => {
    const { showPhoto, ...personaliaWithoutFlag } = validDocument.personalia
    const result = cvDocumentSchema.safeParse({
      ...validDocument,
      personalia: personaliaWithoutFlag,
    })
    expect(result.success).toBe(false)
  })
})

describe('sectionSchema', () => {
  it('accepts a skills section with a 5-step level', () => {
    const result = sectionSchema.safeParse({
      id: 's3',
      type: 'skills',
      enabled: true,
      items: [{ id: 'i1', name: 'TypeScript', level: 5 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a skill level outside the 5-step scale', () => {
    const result = sectionSchema.safeParse({
      id: 's3',
      type: 'skills',
      enabled: true,
      items: [{ id: 'i1', name: 'TypeScript', level: 6 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a languages section using the CEFR scale', () => {
    const result = sectionSchema.safeParse({
      id: 's4',
      type: 'languages',
      enabled: true,
      items: [
        { id: 'i1', name: 'Norsk', level: 'native' },
        { id: 'i2', name: 'Engelsk', level: 'c1' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a numeric level on a languages section', () => {
    const result = sectionSchema.safeParse({
      id: 's4',
      type: 'languages',
      enabled: true,
      items: [{ id: 'i1', name: 'Norsk', level: 5 }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a custom section with the bullets shape', () => {
    const result = sectionSchema.safeParse({
      id: 's5',
      type: 'custom',
      enabled: true,
      title: 'Publikasjoner',
      shape: 'bullets',
      bullets: ['En artikkel'],
    })
    expect(result.success).toBe(true)
  })

  it('exposes every section type in SECTION_TYPES', () => {
    expect(SECTION_TYPES).toContain('drivingLicence')
    expect(new Set(SECTION_TYPES).size).toBe(SECTION_TYPES.length)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/schema`
Expected: FAIL — `Failed to resolve import "@/lib/schema/cv"`.

- [ ] **Step 3: Write the implementation**

Create `lib/schema/cv.ts`:

```ts
import { z } from 'zod'

export const CURRENT_SCHEMA_VERSION = 1

export const cvLanguageSchema = z.enum(['no', 'en'])
export type CvLanguage = z.infer<typeof cvLanguageSchema>

export const paperSchema = z.enum(['a4', 'letter'])
export type PaperId = z.infer<typeof paperSchema>

export const densitySchema = z.enum(['compact', 'normal', 'roomy'])
export type Density = z.infer<typeof densitySchema>

export const skillLevelSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
])
export type SkillLevel = z.infer<typeof skillLevelSchema>

export const languageLevelSchema = z.enum(['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'])
export type LanguageLevel = z.infer<typeof languageLevelSchema>

export const linkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
})
export type CvLink = z.infer<typeof linkSchema>

export const timelineEntrySchema = z.object({
  id: z.string(),
  role: z.string(),
  organisation: z.string(),
  location: z.string().optional(),
  /** "YYYY-MM" */
  from: z.string(),
  /** "YYYY-MM", or "" when `current` is true */
  to: z.string(),
  current: z.boolean(),
  description: z.string().optional(),
  descriptionMode: z.enum(['bullets', 'prose']),
})
export type TimelineEntry = z.infer<typeof timelineEntrySchema>

export const skillItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: skillLevelSchema.optional(),
})
export type SkillItem = z.infer<typeof skillItemSchema>

export const languageItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: languageLevelSchema.optional(),
})
export type LanguageItem = z.infer<typeof languageItemSchema>

export const certEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  /** "YYYY-MM" */
  date: z.string(),
  url: z.string().optional(),
})
export type CertEntry = z.infer<typeof certEntrySchema>

export const referenceEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  organisation: z.string(),
  email: z.string(),
  phone: z.string(),
})
export type ReferenceEntry = z.infer<typeof referenceEntrySchema>

const sectionBase = {
  id: z.string(),
  enabled: z.boolean(),
  titleOverride: z.string().optional(),
}

/** Section types whose payload is a list of timeline entries. */
export const TIMELINE_SECTION_TYPES = [
  'experience', 'education', 'projects', 'volunteering', 'courses',
] as const
export type TimelineSectionType = (typeof TIMELINE_SECTION_TYPES)[number]

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({ ...sectionBase, type: z.literal('summary'), text: z.string() }),
  ...TIMELINE_SECTION_TYPES.map((type) =>
    z.object({
      ...sectionBase,
      type: z.literal(type),
      entries: z.array(timelineEntrySchema),
    }),
  ),
  z.object({ ...sectionBase, type: z.literal('skills'), items: z.array(skillItemSchema) }),
  z.object({ ...sectionBase, type: z.literal('languages'), items: z.array(languageItemSchema) }),
  z.object({ ...sectionBase, type: z.literal('certifications'), entries: z.array(certEntrySchema) }),
  z.object({ ...sectionBase, type: z.literal('references'), entries: z.array(referenceEntrySchema) }),
  z.object({ ...sectionBase, type: z.literal('interests'), items: z.array(z.string()) }),
  z.object({
    ...sectionBase,
    type: z.literal('drivingLicence'),
    classes: z.array(z.string()),
    note: z.string().optional(),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('custom'),
    title: z.string(),
    shape: z.enum(['entries', 'bullets', 'text']),
    entries: z.array(timelineEntrySchema).optional(),
    bullets: z.array(z.string()).optional(),
    text: z.string().optional(),
  }),
])
export type Section = z.infer<typeof sectionSchema>
export type SectionType = Section['type']

export const SECTION_TYPES = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'certifications',
  'projects',
  'courses',
  'volunteering',
  'interests',
  'drivingLicence',
  'references',
  'custom',
] as const satisfies readonly SectionType[]

export const personaliaSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  title: z.string(),
  email: z.string(),
  phone: z.string(),
  city: z.string(),
  country: z.string(),
  birthDate: z.string().optional(),
  photo: z.object({ dataUrl: z.string() }).optional(),
  showPhoto: z.boolean(),
  links: z.array(linkSchema),
})
export type Personalia = z.infer<typeof personaliaSchema>

export const themeSchema = z.object({
  templateId: z.string(),
  accent: z.string(),
  fontPairId: z.string(),
  density: densitySchema,
})
export type CvTheme = z.infer<typeof themeSchema>

export const cvDocumentSchema = z.object({
  id: z.string(),
  schemaVersion: z.number().int(),
  name: z.string(),
  language: cvLanguageSchema,
  paper: paperSchema,
  updatedAt: z.number(),
  theme: themeSchema,
  personalia: personaliaSchema,
  sections: z.array(sectionSchema),
})
export type CvDocument = z.infer<typeof cvDocumentSchema>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test lib/schema`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/schema/cv.ts lib/schema/__tests__/cv.test.ts
git commit -m "feat(schema): add versioned CvDocument zod schema"
```

---

### Task 3: Document defaults

**Files:**
- Create: `lib/schema/defaults.ts`
- Test: `lib/schema/__tests__/defaults.test.ts`

**Interfaces:**
- Consumes: `CURRENT_SCHEMA_VERSION`, `CvDocument`, `Section`, `SectionType`, `CvLanguage`, `PaperId` from `@/lib/schema/cv`
- Produces:
  - `DEFAULT_SECTION_ORDER: readonly Exclude<SectionType, 'custom'>[]`
  - `DEFAULT_ENABLED_SECTIONS: readonly SectionType[]`
  - `createEmptySection(type, deps?): Section`
  - `createEmptyDocument(input: CreateDocumentInput, deps?): CvDocument`
  - `type CreateDocumentInput = { name?: string; language?: CvLanguage; paper?: PaperId; templateId?: string; accent?: string }`
  - `type FactoryDeps = { newId?: () => string; now?: () => number }`

A `FactoryDeps` parameter is threaded through every factory so tests get deterministic ids and timestamps instead of `crypto.randomUUID()` and `Date.now()`.

- [ ] **Step 1: Write the failing test**

Create `lib/schema/__tests__/defaults.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cvDocumentSchema, CURRENT_SCHEMA_VERSION } from '@/lib/schema/cv'
import {
  DEFAULT_ENABLED_SECTIONS,
  DEFAULT_SECTION_ORDER,
  createEmptyDocument,
  createEmptySection,
} from '@/lib/schema/defaults'

function deterministicDeps() {
  let counter = 0
  return { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 }
}

describe('createEmptyDocument', () => {
  it('produces a document that satisfies the schema', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(cvDocumentSchema.safeParse(doc).success).toBe(true)
  })

  it('stamps the current schema version', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('defaults to Norwegian on A4 with the oslo template', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.language).toBe('no')
    expect(doc.paper).toBe('a4')
    expect(doc.theme.templateId).toBe('oslo')
    expect(doc.theme.density).toBe('normal')
  })

  it('honours explicit input', () => {
    const doc = createEmptyDocument(
      { name: 'Backend, London', language: 'en', paper: 'letter', templateId: 'bergen' },
      deterministicDeps(),
    )
    expect(doc.name).toBe('Backend, London')
    expect(doc.language).toBe('en')
    expect(doc.paper).toBe('letter')
    expect(doc.theme.templateId).toBe('bergen')
  })

  it('shows the photo by default', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.personalia.showPhoto).toBe(true)
  })

  it('creates one section per default type, in order', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    expect(doc.sections.map((s) => s.type)).toEqual([...DEFAULT_SECTION_ORDER])
  })

  it('enables only the default-enabled sections', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    const enabled = doc.sections.filter((s) => s.enabled).map((s) => s.type)
    expect(enabled).toEqual(
      DEFAULT_SECTION_ORDER.filter((t) => DEFAULT_ENABLED_SECTIONS.includes(t)),
    )
  })

  it('gives every section a unique id', () => {
    const doc = createEmptyDocument({}, deterministicDeps())
    const ids = doc.sections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('createEmptySection', () => {
  it('creates an experience section with no entries', () => {
    const section = createEmptySection('experience', deterministicDeps())
    expect(section).toMatchObject({ type: 'experience', enabled: true, entries: [] })
  })

  it('creates a custom section with the bullets shape by default', () => {
    const section = createEmptySection('custom', deterministicDeps())
    expect(section).toMatchObject({ type: 'custom', shape: 'bullets', bullets: [] })
  })

  it('creates a driving licence section with no classes', () => {
    const section = createEmptySection('drivingLicence', deterministicDeps())
    expect(section).toMatchObject({ type: 'drivingLicence', classes: [] })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/schema/__tests__/defaults.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/schema/defaults"`.

- [ ] **Step 3: Write the implementation**

Create `lib/schema/defaults.ts`:

```ts
import {
  CURRENT_SCHEMA_VERSION,
  type CvDocument,
  type CvLanguage,
  type PaperId,
  type Section,
  type SectionType,
} from './cv'

export type FactoryDeps = {
  newId?: () => string
  now?: () => number
}

type ResolvedDeps = { newId: () => string; now: () => number }

function resolveDeps(deps: FactoryDeps = {}): ResolvedDeps {
  return {
    newId: deps.newId ?? (() => crypto.randomUUID()),
    now: deps.now ?? (() => Date.now()),
  }
}

/** Canonical order sections appear in on a brand new CV. */
export const DEFAULT_SECTION_ORDER = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'certifications',
  'projects',
  'courses',
  'volunteering',
  'interests',
  'drivingLicence',
  'references',
] as const satisfies readonly Exclude<SectionType, 'custom'>[]

/** Sections switched on for a new CV. The rest exist but start disabled. */
export const DEFAULT_ENABLED_SECTIONS = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
] as const satisfies readonly SectionType[]

export function createEmptySection(type: SectionType, deps?: FactoryDeps): Section {
  const { newId } = resolveDeps(deps)
  const base = { id: newId(), enabled: true }

  switch (type) {
    case 'summary':
      return { ...base, type, text: '' }
    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteering':
    case 'courses':
      return { ...base, type, entries: [] }
    case 'skills':
    case 'languages':
      return { ...base, type, items: [] }
    case 'certifications':
    case 'references':
      return { ...base, type, entries: [] }
    case 'interests':
      return { ...base, type, items: [] }
    case 'drivingLicence':
      return { ...base, type, classes: [] }
    case 'custom':
      return { ...base, type, title: '', shape: 'bullets', bullets: [] }
  }
}

export type CreateDocumentInput = {
  name?: string
  language?: CvLanguage
  paper?: PaperId
  templateId?: string
  accent?: string
}

export function createEmptyDocument(
  input: CreateDocumentInput = {},
  deps?: FactoryDeps,
): CvDocument {
  const resolved = resolveDeps(deps)
  const { newId, now } = resolved

  return {
    id: newId(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    name: input.name ?? '',
    language: input.language ?? 'no',
    paper: input.paper ?? 'a4',
    updatedAt: now(),
    theme: {
      templateId: input.templateId ?? 'oslo',
      accent: input.accent ?? '#2563eb',
      fontPairId: 'inter',
      density: 'normal',
    },
    personalia: {
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phone: '',
      city: '',
      country: '',
      showPhoto: true,
      links: [],
    },
    sections: DEFAULT_SECTION_ORDER.map((type) => ({
      ...createEmptySection(type, resolved),
      enabled: (DEFAULT_ENABLED_SECTIONS as readonly SectionType[]).includes(type),
    })),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test lib/schema`
Expected: PASS — all schema and defaults tests.

- [ ] **Step 5: Commit**

```bash
git add lib/schema/defaults.ts lib/schema/__tests__/defaults.test.ts
git commit -m "feat(schema): add document and section factories with injectable deps"
```

---

### Task 4: Schema migrations

**Files:**
- Create: `lib/schema/migrations.ts`
- Test: `lib/schema/__tests__/migrations.test.ts`

**Interfaces:**
- Consumes: `CURRENT_SCHEMA_VERSION`, `cvDocumentSchema`, `CvDocument` from `@/lib/schema/cv`
- Produces:
  - `class SchemaError extends Error` with `readonly reason: 'missing-version' | 'future-version' | 'no-migration' | 'invalid'`
  - `migrateDocument(raw: unknown): CvDocument` — throws `SchemaError`
  - `safeMigrateDocument(raw: unknown): { ok: true; document: CvDocument } | { ok: false; error: SchemaError }`
  - `migrations: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>>` — empty at v1; a migration from version N to N+1 is registered under key N

- [ ] **Step 1: Write the failing test**

Create `lib/schema/__tests__/migrations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import { SchemaError, migrateDocument, safeMigrateDocument } from '@/lib/schema/migrations'

function fixture() {
  let counter = 0
  return createEmptyDocument(
    { name: 'Test' },
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )
}

describe('migrateDocument', () => {
  it('passes a current-version document through unchanged', () => {
    const doc = fixture()
    expect(migrateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('throws when schemaVersion is missing', () => {
    const { schemaVersion, ...withoutVersion } = fixture()
    expect(() => migrateDocument(withoutVersion)).toThrowError(SchemaError)
    try {
      migrateDocument(withoutVersion)
    } catch (error) {
      expect((error as SchemaError).reason).toBe('missing-version')
    }
  })

  it('refuses a document written by a newer version of the app', () => {
    const doc = { ...fixture(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }
    try {
      migrateDocument(doc)
      throw new Error('expected migrateDocument to throw')
    } catch (error) {
      expect((error as SchemaError).reason).toBe('future-version')
    }
  })

  it('rejects a structurally invalid document', () => {
    const doc = { ...fixture(), personalia: { firstName: 'Ola' } }
    try {
      migrateDocument(doc)
      throw new Error('expected migrateDocument to throw')
    } catch (error) {
      expect((error as SchemaError).reason).toBe('invalid')
    }
  })

  it('rejects a non-object payload', () => {
    expect(() => migrateDocument('nope')).toThrowError(SchemaError)
  })
})

describe('safeMigrateDocument', () => {
  it('returns ok for a valid document', () => {
    const result = safeMigrateDocument(JSON.parse(JSON.stringify(fixture())))
    expect(result.ok).toBe(true)
  })

  it('returns the error instead of throwing for an invalid document', () => {
    const result = safeMigrateDocument({ schemaVersion: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe('invalid')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/schema/__tests__/migrations.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/schema/migrations"`.

- [ ] **Step 3: Write the implementation**

Create `lib/schema/migrations.ts`:

```ts
import { CURRENT_SCHEMA_VERSION, type CvDocument, cvDocumentSchema } from './cv'

export type SchemaErrorReason =
  | 'missing-version'
  | 'future-version'
  | 'no-migration'
  | 'invalid'

export class SchemaError extends Error {
  readonly reason: SchemaErrorReason

  constructor(reason: SchemaErrorReason, message: string) {
    super(message)
    this.name = 'SchemaError'
    this.reason = reason
  }
}

type RawDocument = Record<string, unknown>

/**
 * A migration registered under key N upgrades a document from schemaVersion N
 * to schemaVersion N+1. Empty while CURRENT_SCHEMA_VERSION is 1.
 */
export const migrations: Record<number, (doc: RawDocument) => RawDocument> = {}

function isRecord(value: unknown): value is RawDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function migrateDocument(raw: unknown): CvDocument {
  if (!isRecord(raw)) {
    throw new SchemaError('missing-version', 'Stored value is not an object.')
  }

  const version = raw.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new SchemaError('missing-version', 'Stored document has no schemaVersion.')
  }

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new SchemaError(
      'future-version',
      `Document uses schema version ${version}, but this app understands at most ${CURRENT_SCHEMA_VERSION}.`,
    )
  }

  let current = raw
  let currentVersion = version

  while (currentVersion < CURRENT_SCHEMA_VERSION) {
    const migration = migrations[currentVersion]
    if (!migration) {
      throw new SchemaError(
        'no-migration',
        `No migration registered from schema version ${currentVersion}.`,
      )
    }
    current = migration(current)
    currentVersion += 1
    current.schemaVersion = currentVersion
  }

  const parsed = cvDocumentSchema.safeParse(current)
  if (!parsed.success) {
    throw new SchemaError('invalid', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  }

  return parsed.data
}

export function safeMigrateDocument(
  raw: unknown,
): { ok: true; document: CvDocument } | { ok: false; error: SchemaError } {
  try {
    return { ok: true, document: migrateDocument(raw) }
  } catch (error) {
    if (error instanceof SchemaError) return { ok: false, error }
    throw error
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test lib/schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schema/migrations.ts lib/schema/__tests__/migrations.test.ts
git commit -m "feat(schema): add versioned document migration with typed errors"
```

---

### Task 5: Documents store with localStorage persistence

**Files:**
- Create: `lib/store/documents.ts`
- Test: `lib/store/__tests__/documents.test.ts`

**Interfaces:**
- Consumes: `CvDocument` from `@/lib/schema/cv`; `createEmptyDocument`, `CreateDocumentInput`, `FactoryDeps` from `@/lib/schema/defaults`; `safeMigrateDocument`, `SchemaError` from `@/lib/schema/migrations`; `STORAGE_PREFIX` from `@/lib/app-meta`
- Produces:
  - `DOCUMENTS_STORAGE_KEY = 'cvapp:documents:v1'`
  - `type DocumentsStore` with state `{ documents: Record<string, CvDocument>; order: string[] }` and actions `createDocument`, `duplicateDocument`, `deleteDocument`, `renameDocument`, `updateDocument`, `importDocument`, `replaceAll`
  - `createDocumentsStore(options?: DocumentsStoreOptions): UseBoundStore<StoreApi<DocumentsStore>>`
  - `useDocuments` — the app-wide store instance
  - `selectOrderedDocuments(state): CvDocument[]`
  - `selectDocument(id): (state) => CvDocument | undefined`
- Notes for later tasks: `updateDocument(id, recipe)` takes an **immer draft recipe**, so callers mutate `draft.personalia.firstName = 'Ola'` rather than spreading. It stamps `updatedAt` automatically.

- [ ] **Step 1: Write the failing test**

Create `lib/store/__tests__/documents.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DOCUMENTS_STORAGE_KEY,
  createDocumentsStore,
  selectOrderedDocuments,
} from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

function deterministicDeps() {
  let counter = 0
  return { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 }
}

describe('documents store', () => {
  let storage: ReturnType<typeof memoryStorage>

  beforeEach(() => {
    storage = memoryStorage()
  })

  function store() {
    return createDocumentsStore({ storage, deps: deterministicDeps() })
  }

  it('starts empty', () => {
    const s = store()
    expect(s.getState().order).toEqual([])
    expect(selectOrderedDocuments(s.getState())).toEqual([])
  })

  it('creates a document and returns its id', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'Frontend' })
    expect(s.getState().documents[id]?.name).toBe('Frontend')
    expect(s.getState().order).toEqual([id])
  })

  it('puts the newest document first', () => {
    const s = store()
    const first = s.getState().createDocument({ name: 'A' })
    const second = s.getState().createDocument({ name: 'B' })
    expect(s.getState().order).toEqual([second, first])
  })

  it('updates a document through an immer recipe', () => {
    const s = store()
    const id = s.getState().createDocument({})
    s.getState().updateDocument(id, (draft) => {
      draft.personalia.firstName = 'Ola'
    })
    expect(s.getState().documents[id]?.personalia.firstName).toBe('Ola')
  })

  it('ignores an update for an unknown id', () => {
    const s = store()
    expect(() =>
      s.getState().updateDocument('missing', (draft) => {
        draft.name = 'x'
      }),
    ).not.toThrow()
  })

  it('duplicates a document without sharing state', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'Original' })
    s.getState().updateDocument(id, (draft) => {
      draft.personalia.firstName = 'Ola'
    })
    const copyId = s.getState().duplicateDocument(id, 'Copy')
    expect(copyId).toBeDefined()
    expect(copyId).not.toBe(id)
    expect(s.getState().documents[copyId!]?.name).toBe('Copy')
    expect(s.getState().documents[copyId!]?.personalia.firstName).toBe('Ola')

    s.getState().updateDocument(copyId!, (draft) => {
      draft.personalia.firstName = 'Kari'
    })
    expect(s.getState().documents[id]?.personalia.firstName).toBe('Ola')
  })

  it('deletes a document and removes it from the order', () => {
    const s = store()
    const id = s.getState().createDocument({})
    s.getState().deleteDocument(id)
    expect(s.getState().documents[id]).toBeUndefined()
    expect(s.getState().order).toEqual([])
  })

  it('renames a document', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'Old' })
    s.getState().renameDocument(id, 'New')
    expect(s.getState().documents[id]?.name).toBe('New')
  })

  it('persists to the namespaced storage key', () => {
    const s = store()
    s.getState().createDocument({ name: 'Persisted' })
    const raw = storage.map.get(DOCUMENTS_STORAGE_KEY)
    expect(raw).toBeDefined()
    expect(raw).toContain('Persisted')
  })

  it('rehydrates documents from storage', () => {
    const first = store()
    const id = first.getState().createDocument({ name: 'Persisted' })

    const second = createDocumentsStore({ storage, deps: deterministicDeps() })
    expect(second.getState().documents[id]?.name).toBe('Persisted')
  })

  it('drops a stored document that fails validation', () => {
    storage.map.set(
      DOCUMENTS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          documents: { broken: { schemaVersion: 1, id: 'broken' } },
          order: ['broken'],
        },
      }),
    )
    const s = createDocumentsStore({ storage, deps: deterministicDeps() })
    expect(s.getState().order).toEqual([])
    expect(s.getState().documents.broken).toBeUndefined()
  })

  it('imports a valid document and reports the new id', () => {
    const source = store()
    const id = source.getState().createDocument({ name: 'Imported' })
    const exported = JSON.parse(JSON.stringify(source.getState().documents[id]))

    const target = createDocumentsStore({ storage: memoryStorage(), deps: deterministicDeps() })
    const result = target.getState().importDocument(exported)
    expect(result.ok).toBe(true)
    if (result.ok) expect(target.getState().documents[result.id]?.name).toBe('Imported')
  })

  it('reports an error rather than throwing on a bad import', () => {
    const s = store()
    const result = s.getState().importDocument({ nope: true })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/store`
Expected: FAIL — `Failed to resolve import "@/lib/store/documents"`.

- [ ] **Step 3: Write the implementation**

Create `lib/store/documents.ts`:

```ts
import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { CvDocument } from '@/lib/schema/cv'
import {
  type CreateDocumentInput,
  type FactoryDeps,
  createEmptyDocument,
} from '@/lib/schema/defaults'
import { type SchemaError, safeMigrateDocument } from '@/lib/schema/migrations'

export const DOCUMENTS_STORAGE_KEY = 'cvapp:documents:v1'

export type DocumentsState = {
  documents: Record<string, CvDocument>
  /** Document ids, newest first. */
  order: string[]
}

export type ImportResult =
  | { ok: true; id: string }
  | { ok: false; error: SchemaError }

export type DocumentsActions = {
  createDocument(input?: CreateDocumentInput): string
  duplicateDocument(id: string, name?: string): string | undefined
  deleteDocument(id: string): void
  renameDocument(id: string, name: string): void
  updateDocument(id: string, recipe: (draft: CvDocument) => void): void
  importDocument(raw: unknown): ImportResult
  replaceAll(documents: CvDocument[]): void
}

export type DocumentsStore = DocumentsState & DocumentsActions

type StringStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type DocumentsStoreOptions = {
  /** Defaults to window.localStorage. Injected in tests. */
  storage?: StringStorage
  deps?: FactoryDeps
}

function resolve(deps: FactoryDeps = {}) {
  return {
    newId: deps.newId ?? (() => crypto.randomUUID()),
    now: deps.now ?? (() => Date.now()),
  }
}

/** Validates every stored document, silently dropping ones that no longer parse. */
function reviveState(persisted: unknown): DocumentsState {
  const empty: DocumentsState = { documents: {}, order: [] }
  if (typeof persisted !== 'object' || persisted === null) return empty

  const candidate = persisted as Partial<DocumentsState>
  const rawDocuments = candidate.documents
  if (typeof rawDocuments !== 'object' || rawDocuments === null) return empty

  const documents: Record<string, CvDocument> = {}
  for (const [id, raw] of Object.entries(rawDocuments)) {
    const result = safeMigrateDocument(raw)
    if (result.ok) documents[id] = result.document
  }

  const order = Array.isArray(candidate.order)
    ? candidate.order.filter((id): id is string => typeof id === 'string' && id in documents)
    : []

  // Any document that survived validation but is missing from `order` is appended,
  // so a corrupted order array can never hide a valid CV.
  for (const id of Object.keys(documents)) {
    if (!order.includes(id)) order.push(id)
  }

  return { documents, order }
}

export function createDocumentsStore(
  options: DocumentsStoreOptions = {},
): UseBoundStore<StoreApi<DocumentsStore>> {
  const { newId, now } = resolve(options.deps)

  return create<DocumentsStore>()(
    persist(
      immer((set, get) => ({
        documents: {},
        order: [],

        createDocument(input = {}) {
          const doc = createEmptyDocument(input, { newId, now })
          set((state) => {
            state.documents[doc.id] = doc
            state.order.unshift(doc.id)
          })
          return doc.id
        },

        duplicateDocument(id, name) {
          const original = get().documents[id]
          if (!original) return undefined
          const copy: CvDocument = {
            ...structuredClone(original),
            id: newId(),
            name: name ?? original.name,
            updatedAt: now(),
          }
          set((state) => {
            state.documents[copy.id] = copy
            state.order.unshift(copy.id)
          })
          return copy.id
        },

        deleteDocument(id) {
          set((state) => {
            delete state.documents[id]
            state.order = state.order.filter((existing) => existing !== id)
          })
        },

        renameDocument(id, name) {
          set((state) => {
            const doc = state.documents[id]
            if (!doc) return
            doc.name = name
            doc.updatedAt = now()
          })
        },

        updateDocument(id, recipe) {
          set((state) => {
            const doc = state.documents[id]
            if (!doc) return
            recipe(doc)
            doc.updatedAt = now()
          })
        },

        importDocument(raw) {
          const result = safeMigrateDocument(raw)
          if (!result.ok) return result
          const imported: CvDocument = { ...result.document, id: newId(), updatedAt: now() }
          set((state) => {
            state.documents[imported.id] = imported
            state.order.unshift(imported.id)
          })
          return { ok: true, id: imported.id }
        },

        replaceAll(documents) {
          set((state) => {
            state.documents = Object.fromEntries(documents.map((doc) => [doc.id, doc]))
            state.order = documents.map((doc) => doc.id)
          })
        },
      })),
      {
        name: DOCUMENTS_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() =>
          options.storage ?? (typeof window === 'undefined' ? undefined : window.localStorage),
        ),
        partialize: (state) => ({ documents: state.documents, order: state.order }),
        merge: (persisted, current) => ({ ...current, ...reviveState(persisted) }),
      },
    ),
  )
}

export const useDocuments = createDocumentsStore()

export function selectOrderedDocuments(state: DocumentsState): CvDocument[] {
  return state.order
    .map((id) => state.documents[id])
    .filter((doc): doc is CvDocument => Boolean(doc))
}

export function selectDocument(id: string) {
  return (state: DocumentsState): CvDocument | undefined => state.documents[id]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test lib/store`
Expected: PASS — 14 tests.

- [ ] **Step 5: Verify types**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/store/documents.ts lib/store/__tests__/documents.test.ts
git commit -m "feat(store): add persisted documents store with validation on rehydrate"
```

---

### Task 6: Leading-edge throttle utility

**Files:**
- Create: `lib/utils/throttle-leading.ts`
- Test: `lib/utils/__tests__/throttle-leading.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `throttleLeading<Args extends unknown[]>(fn: (...args: Args) => void, waitMs: number): (...args: Args) => void`

**Why leading edge, not a debounce.** Task 7 groups keystrokes into a single undo step. zundo hands the history hook the state *before* each change. A trailing debounce would keep the state before the **last** keystroke of a burst — undo would then rewind one character. A leading-edge throttle keeps the state before the **first** keystroke and discards the rest, which is the behaviour we want.

- [ ] **Step 1: Write the failing test**

Create `lib/utils/__tests__/throttle-leading.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttleLeading } from '@/lib/utils/throttle-leading'

describe('throttleLeading', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('invokes immediately on the first call', () => {
    const spy = vi.fn()
    throttleLeading(spy, 400)('first')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('first')
  })

  it('drops calls made inside the window', () => {
    const spy = vi.fn()
    const throttled = throttleLeading(spy, 400)
    throttled('a')
    throttled('b')
    throttled('c')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('a')
  })

  it('does not fire a trailing call when the window elapses', () => {
    const spy = vi.fn()
    const throttled = throttleLeading(spy, 400)
    throttled('a')
    throttled('b')
    vi.advanceTimersByTime(400)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('invokes again once the window has elapsed', () => {
    const spy = vi.fn()
    const throttled = throttleLeading(spy, 400)
    throttled('a')
    vi.advanceTimersByTime(400)
    throttled('b')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenLastCalledWith('b')
  })

  it('treats each throttled function as independent', () => {
    const first = vi.fn()
    const second = vi.fn()
    throttleLeading(first, 400)('a')
    throttleLeading(second, 400)('b')
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/utils`
Expected: FAIL — `Failed to resolve import "@/lib/utils/throttle-leading"`.

- [ ] **Step 3: Write the implementation**

Create `lib/utils/throttle-leading.ts`:

```ts
/**
 * Calls `fn` immediately, then ignores every call made within `waitMs` of it.
 * There is no trailing call: the first value in a burst wins.
 */
export function throttleLeading<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): (...args: Args) => void {
  let blockedUntil = 0

  return (...args: Args) => {
    const now = Date.now()
    if (now < blockedUntil) return
    blockedUntil = now + waitMs
    fn(...args)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test lib/utils`
Expected: PASS — 5 tests.

Note: `vi.useFakeTimers()` in Vitest also fakes `Date.now()`, so `vi.advanceTimersByTime` moves the clock this implementation reads.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/throttle-leading.ts lib/utils/__tests__/throttle-leading.test.ts
git commit -m "feat(utils): add leading-edge throttle for grouping history entries"
```

---

### Task 7: Undo and redo

**Files:**
- Modify: `lib/store/documents.ts`
- Test: `lib/store/__tests__/documents-history.test.ts`

**Interfaces:**
- Consumes: `throttleLeading` from `@/lib/utils/throttle-leading`; everything already in `lib/store/documents.ts`
- Produces:
  - `HISTORY_LIMIT = 100`
  - `HISTORY_GROUPING_MS = 400`
  - `type DocumentsHistory = Pick<DocumentsState, 'documents' | 'order'>`
  - `type DocumentsStoreApi = UseBoundStore<StoreApi<DocumentsStore>> & { temporal: StoreApi<TemporalState<DocumentsHistory>> }`
  - `createDocumentsStore` now returns `DocumentsStoreApi`
  - `useDocumentsTemporal` — a React hook over the temporal store, for `undo()`, `redo()`, `pastStates`, `futureStates`

- [ ] **Step 1: Write the failing test**

Create `lib/store/__tests__/documents-history.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORY_GROUPING_MS, createDocumentsStore } from '@/lib/store/documents'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

function deterministicDeps() {
  let counter = 0
  return { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 }
}

describe('documents history', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function store() {
    return createDocumentsStore({ storage: memoryStorage(), deps: deterministicDeps() })
  }

  it('exposes a temporal store', () => {
    const s = store()
    expect(s.temporal).toBeDefined()
    expect(typeof s.temporal.getState().undo).toBe('function')
  })

  it('records history for a create', () => {
    const s = store()
    s.getState().createDocument({ name: 'A' })
    expect(s.temporal.getState().pastStates.length).toBe(1)
  })

  it('undo removes the created document', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    s.temporal.getState().undo()
    expect(s.getState().documents[id]).toBeUndefined()
    expect(s.getState().order).toEqual([])
  })

  it('redo restores the undone document', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    s.temporal.getState().undo()
    s.temporal.getState().redo()
    expect(s.getState().documents[id]?.name).toBe('A')
  })

  it('groups a burst of edits into one undo step', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)

    const before = s.temporal.getState().pastStates.length
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'O'))
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ol'))
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ola'))

    expect(s.temporal.getState().pastStates.length).toBe(before + 1)
  })

  it('undoes an entire burst in one step', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)

    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'O'))
    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ola'))

    s.temporal.getState().undo()
    expect(s.getState().documents[id]?.personalia.firstName).toBe('')
  })

  it('starts a new undo step once the grouping window elapses', () => {
    const s = store()
    const id = s.getState().createDocument({ name: 'A' })
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)

    s.getState().updateDocument(id, (draft) => void (draft.personalia.firstName = 'Ola'))
    vi.advanceTimersByTime(HISTORY_GROUPING_MS)
    s.getState().updateDocument(id, (draft) => void (draft.personalia.lastName = 'Nordmann'))

    s.temporal.getState().undo()
    expect(s.getState().documents[id]?.personalia.firstName).toBe('Ola')
    expect(s.getState().documents[id]?.personalia.lastName).toBe('')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/store/__tests__/documents-history.test.ts`
Expected: FAIL — `s.temporal` is undefined.

- [ ] **Step 3: Add the temporal middleware**

Edit `lib/store/documents.ts`.

Add these imports at the top of the file:

```ts
import { useStore } from 'zustand'
import { temporal, type TemporalState } from 'zundo'
import { throttleLeading } from '@/lib/utils/throttle-leading'
```

Add these constants directly below `DOCUMENTS_STORAGE_KEY`:

```ts
export const HISTORY_LIMIT = 100
export const HISTORY_GROUPING_MS = 400

export type DocumentsHistory = Pick<DocumentsState, 'documents' | 'order'>

export type DocumentsStoreApi = UseBoundStore<StoreApi<DocumentsStore>> & {
  temporal: StoreApi<TemporalState<DocumentsHistory>>
}
```

Change the `createDocumentsStore` return type from
`UseBoundStore<StoreApi<DocumentsStore>>` to `DocumentsStoreApi`, and wrap the
`immer(...)` call in `temporal(...)` so the middleware order becomes
`persist(temporal(immer(creator), temporalOptions), persistOptions)`.

Concretely, the `return create<DocumentsStore>()(persist(` line stays, the
`immer((set, get) => ({` line becomes `temporal(immer((set, get) => ({`, and the
closing `})),` of the immer creator becomes:

```ts
      })), {
        limit: HISTORY_LIMIT,
        partialize: (state): DocumentsHistory => ({
          documents: state.documents,
          order: state.order,
        }),
        handleSet: (handleSet) => throttleLeading(handleSet, HISTORY_GROUPING_MS),
      }),
```

Finally, cast the created store on return so the temporal handle is typed:

```ts
  ) as DocumentsStoreApi
```

- [ ] **Step 4: Update the store instance and add the React hook**

Replace the `export const useDocuments = createDocumentsStore()` line with:

```ts
export const useDocuments: DocumentsStoreApi = createDocumentsStore()

/**
 * React hook over the undo/redo store.
 * `useDocumentsTemporal((s) => s.undo)` returns a stable undo function.
 */
export function useDocumentsTemporal<T>(
  selector: (state: TemporalState<DocumentsHistory>) => T,
): T {
  return useStore(useDocuments.temporal, selector)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun run test lib/store`
Expected: PASS — the 14 documents tests plus 7 history tests.

- [ ] **Step 6: Verify types**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/store/documents.ts lib/store/__tests__/documents-history.test.ts
git commit -m "feat(store): add grouped undo/redo via zundo temporal middleware"
```

---

### Task 8: CV label dictionaries

**Files:**
- Create: `lib/cv-labels/types.ts`
- Create: `lib/cv-labels/no.ts`
- Create: `lib/cv-labels/en.ts`
- Create: `lib/cv-labels/index.ts`
- Create: `lib/cv-labels/format.ts`
- Test: `lib/cv-labels/__tests__/labels.test.ts`
- Test: `lib/cv-labels/__tests__/format.test.ts`

**Interfaces:**
- Consumes: `SectionType`, `SkillLevel`, `LanguageLevel`, `CvLanguage` from `@/lib/schema/cv`
- Produces:
  - `type CvLabels` (see below)
  - `getCvLabels(language: CvLanguage): CvLabels`
  - `CV_LABELS: Record<CvLanguage, CvLabels>`
  - `formatMonthYear(value: string, labels: CvLabels): string`
  - `formatDateRange(from: string, to: string, current: boolean, labels: CvLabels): string`

**These are the CV *output* labels and are deliberately separate from the app UI translations in `messages/`.** A user can run a Norwegian UI while writing an English CV, so the two must be resolvable independently.

- [ ] **Step 1: Write the failing tests**

Create `lib/cv-labels/__tests__/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SECTION_TYPES } from '@/lib/schema/cv'
import { CV_LABELS, getCvLabels } from '@/lib/cv-labels'

const locales = ['no', 'en'] as const

describe('CV labels', () => {
  it('provides a dictionary per CV language', () => {
    expect(Object.keys(CV_LABELS).sort()).toEqual(['en', 'no'])
  })

  it.each(locales)('%s covers every section type', (locale) => {
    for (const type of SECTION_TYPES) {
      expect(CV_LABELS[locale].sections[type], `${locale} is missing ${type}`).toBeTruthy()
    }
  })

  it.each(locales)('%s has all five skill levels', (locale) => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(CV_LABELS[locale].skillLevels[level]).toBeTruthy()
    }
  })

  it.each(locales)('%s has all seven language levels', (locale) => {
    for (const level of ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'] as const) {
      expect(CV_LABELS[locale].languageLevels[level]).toBeTruthy()
    }
  })

  it.each(locales)('%s has twelve month names', (locale) => {
    expect(CV_LABELS[locale].months).toHaveLength(12)
    for (const month of CV_LABELS[locale].months) expect(month).toBeTruthy()
  })

  it('keeps the two dictionaries structurally identical', () => {
    const shape = (value: unknown): unknown => {
      if (Array.isArray(value)) return `array:${value.length}`
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, nested]) => [key, shape(nested)]),
        )
      }
      return typeof value
    }
    expect(shape(CV_LABELS.no)).toEqual(shape(CV_LABELS.en))
  })

  it('uses the Norwegian references-on-request convention', () => {
    expect(CV_LABELS.no.referencesOnRequest).toBe('Referanser oppgis ved forespørsel')
  })

  it('resolves a dictionary by language', () => {
    expect(getCvLabels('no').sections.experience).toBe('Arbeidserfaring')
    expect(getCvLabels('en').sections.experience).toBe('Work Experience')
  })
})
```

Create `lib/cv-labels/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getCvLabels } from '@/lib/cv-labels'
import { formatDateRange, formatMonthYear } from '@/lib/cv-labels/format'

const no = getCvLabels('no')
const en = getCvLabels('en')

describe('formatMonthYear', () => {
  it('formats a Norwegian month and year', () => {
    expect(formatMonthYear('2022-01', no)).toBe('jan. 2022')
  })

  it('formats an English month and year', () => {
    expect(formatMonthYear('2022-01', en)).toBe('Jan 2022')
  })

  it('returns an empty string for an empty value', () => {
    expect(formatMonthYear('', no)).toBe('')
  })

  it('falls back to the raw value when the month is out of range', () => {
    expect(formatMonthYear('2022-13', no)).toBe('2022-13')
  })

  it('accepts a bare year', () => {
    expect(formatMonthYear('2022', no)).toBe('2022')
  })
})

describe('formatDateRange', () => {
  it('renders a closed range', () => {
    expect(formatDateRange('2020-08', '2022-06', false, en)).toBe('Aug 2020 – Jun 2022')
  })

  it('renders an ongoing role using the present label', () => {
    expect(formatDateRange('2022-01', '', true, no)).toBe('jan. 2022 – nå')
  })

  it('ignores the end date when current is true', () => {
    expect(formatDateRange('2022-01', '2023-01', true, en)).toBe('Jan 2022 – Present')
  })

  it('renders only the start when there is no end and it is not current', () => {
    expect(formatDateRange('2022-01', '', false, en)).toBe('Jan 2022')
  })

  it('renders nothing when there are no dates', () => {
    expect(formatDateRange('', '', false, en)).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test lib/cv-labels`
Expected: FAIL — `Failed to resolve import "@/lib/cv-labels"`.

- [ ] **Step 3: Write the label type**

Create `lib/cv-labels/types.ts`:

```ts
import type { LanguageLevel, SectionType, SkillLevel } from '@/lib/schema/cv'

export type CvLabels = {
  sections: Record<SectionType, string>
  skillLevels: Record<SkillLevel, string>
  languageLevels: Record<LanguageLevel, string>
  /** Shown in place of an end date for a current role. */
  present: string
  /** Twelve abbreviated month names, January first. */
  months: string[]
  referencesOnRequest: string
  drivingLicenceClass: string
}
```

- [ ] **Step 4: Write the Norwegian dictionary**

Create `lib/cv-labels/no.ts`:

```ts
import type { CvLabels } from './types'

export const no: CvLabels = {
  sections: {
    summary: 'Om meg',
    experience: 'Arbeidserfaring',
    education: 'Utdanning',
    skills: 'Ferdigheter',
    languages: 'Språk',
    certifications: 'Sertifiseringer',
    projects: 'Prosjekter',
    courses: 'Kurs',
    volunteering: 'Frivillig arbeid',
    interests: 'Interesser',
    drivingLicence: 'Førerkort',
    references: 'Referanser',
    custom: 'Egendefinert',
  },
  skillLevels: {
    1: 'Nybegynner',
    2: 'Grunnleggende',
    3: 'Middels',
    4: 'Avansert',
    5: 'Ekspert',
  },
  languageLevels: {
    a1: 'A1',
    a2: 'A2',
    b1: 'B1',
    b2: 'B2',
    c1: 'C1',
    c2: 'C2',
    native: 'Morsmål',
  },
  present: 'nå',
  months: [
    'jan.', 'feb.', 'mar.', 'apr.', 'mai', 'jun.',
    'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'des.',
  ],
  referencesOnRequest: 'Referanser oppgis ved forespørsel',
  drivingLicenceClass: 'Klasse',
}
```

- [ ] **Step 5: Write the English dictionary**

Create `lib/cv-labels/en.ts`:

```ts
import type { CvLabels } from './types'

export const en: CvLabels = {
  sections: {
    summary: 'Profile',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    certifications: 'Certifications',
    projects: 'Projects',
    courses: 'Courses',
    volunteering: 'Volunteering',
    interests: 'Interests',
    drivingLicence: 'Driving Licence',
    references: 'References',
    custom: 'Custom',
  },
  skillLevels: {
    1: 'Beginner',
    2: 'Basic',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
  },
  languageLevels: {
    a1: 'A1',
    a2: 'A2',
    b1: 'B1',
    b2: 'B2',
    c1: 'C1',
    c2: 'C2',
    native: 'Native',
  },
  present: 'Present',
  months: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ],
  referencesOnRequest: 'References available on request',
  drivingLicenceClass: 'Class',
}
```

- [ ] **Step 6: Write the resolver**

Create `lib/cv-labels/index.ts`:

```ts
import type { CvLanguage } from '@/lib/schema/cv'
import { en } from './en'
import { no } from './no'
import type { CvLabels } from './types'

export type { CvLabels } from './types'

export const CV_LABELS: Record<CvLanguage, CvLabels> = { no, en }

export function getCvLabels(language: CvLanguage): CvLabels {
  return CV_LABELS[language]
}
```

- [ ] **Step 7: Write the date formatters**

Create `lib/cv-labels/format.ts`:

```ts
import type { CvLabels } from './types'

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

/** Formats "YYYY-MM" as a localized abbreviated month and year. */
export function formatMonthYear(value: string, labels: CvLabels): string {
  if (!value) return ''

  const match = MONTH_PATTERN.exec(value)
  if (!match) return value

  const [, year, rawMonth] = match
  const monthIndex = Number(rawMonth) - 1
  const month = labels.months[monthIndex]
  if (!month) return value

  return `${month} ${year}`
}

export function formatDateRange(
  from: string,
  to: string,
  current: boolean,
  labels: CvLabels,
): string {
  const start = formatMonthYear(from, labels)
  const end = current ? labels.present : formatMonthYear(to, labels)

  if (start && end) return `${start} – ${end}`
  return start || end
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `bun run test lib/cv-labels`
Expected: PASS — 8 label tests and 10 format tests.

- [ ] **Step 9: Commit**

```bash
git add lib/cv-labels
git commit -m "feat(labels): add Norwegian and English CV output dictionaries"
```

---

### Task 9: Contrast maths and theme tokens

**Files:**
- Create: `lib/theme/contrast.ts`
- Create: `lib/theme/fonts.ts`
- Create: `lib/theme/tokens.ts`
- Test: `lib/theme/__tests__/contrast.test.ts`
- Test: `lib/theme/__tests__/tokens.test.ts`

**Interfaces:**
- Consumes: `CvTheme`, `Density` from `@/lib/schema/cv`
- Produces:
  - `parseHex(hex: string): { r: number; g: number; b: number } | null`
  - `relativeLuminance(hex: string): number`
  - `contrastRatio(a: string, b: string): number`
  - `pickInk(accent: string, options?: { light?: string; dark?: string }): string`
  - `FONT_PAIRS: FontPair[]`, `DEFAULT_FONT_PAIR_ID`, `getFontPair(id: string): FontPair`
  - `DENSITY_SCALE: Record<Density, number>`
  - `type ThemeTokenValues`, `type CvThemeStyle`
  - `buildThemeTokens(theme: CvTheme, overrides?: Partial<ThemeTokenValues>): ThemeTokenValues`
  - `themeTokensToStyle(tokens: ThemeTokenValues): CvThemeStyle`
- Note for Task 11: templates supply their own `Partial<ThemeTokenValues>`; this module knows nothing about templates, which keeps the dependency one-directional.

- [ ] **Step 1: Write the failing contrast test**

Create `lib/theme/__tests__/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseHex, pickInk, relativeLuminance } from '@/lib/theme/contrast'

describe('parseHex', () => {
  it('parses a six-digit hex', () => {
    expect(parseHex('#2563eb')).toEqual({ r: 0x25, g: 0x63, b: 0xeb })
  })

  it('expands a three-digit hex', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('tolerates a missing hash', () => {
    expect(parseHex('000000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('returns null for nonsense', () => {
    expect(parseHex('rebeccapurple')).toBeNull()
    expect(parseHex('#12345')).toBeNull()
  })
})

describe('relativeLuminance', () => {
  it('is 1 for white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('is 0 for black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('treats an unparseable colour as black', () => {
    expect(relativeLuminance('nope')).toBe(0)
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#2563eb', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#2563eb'),
      6,
    )
  })

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1, 6)
  })
})

describe('pickInk', () => {
  it('chooses dark ink on a bright yellow accent', () => {
    expect(pickInk('#ffe600')).toBe('#111111')
  })

  it('chooses light ink on a deep blue accent', () => {
    expect(pickInk('#1e3a8a')).toBe('#ffffff')
  })

  it('honours custom ink colours', () => {
    expect(pickInk('#ffe600', { dark: '#222', light: '#eee' })).toBe('#222')
  })

  it('falls back to dark ink for an unparseable accent', () => {
    expect(pickInk('nope')).toBe('#ffffff')
  })
})
```

Note the last case: an unparseable accent is treated as black, and light ink is correct on black.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/theme`
Expected: FAIL — `Failed to resolve import "@/lib/theme/contrast"`.

- [ ] **Step 3: Write the contrast implementation**

Create `lib/theme/contrast.ts`:

```ts
export type Rgb = { r: number; g: number; b: number }

const SHORT_HEX = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i
const LONG_HEX = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

export function parseHex(hex: string): Rgb | null {
  const short = SHORT_HEX.exec(hex)
  if (short) {
    const [, r, g, b] = short
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    }
  }

  const long = LONG_HEX.exec(hex)
  if (long) {
    const [, r, g, b] = long
    return {
      r: Number.parseInt(r!, 16),
      g: Number.parseInt(g!, 16),
      b: Number.parseInt(b!, 16),
    }
  }

  return null
}

function channelToLinear(value: number): number {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 relative luminance. Unparseable colours are treated as black. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0

  return (
    0.2126 * channelToLinear(rgb.r) +
    0.7152 * channelToLinear(rgb.g) +
    0.0722 * channelToLinear(rgb.b)
  )
}

/** WCAG 2.1 contrast ratio, between 1 and 21. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Picks whichever ink colour is more readable on `accent`.
 * This is what stops a pale user-picked accent from producing an
 * invisible header in the exported PDF.
 */
export function pickInk(
  accent: string,
  options: { light?: string; dark?: string } = {},
): string {
  const light = options.light ?? '#ffffff'
  const dark = options.dark ?? '#111111'
  return contrastRatio(accent, dark) >= contrastRatio(accent, light) ? dark : light
}
```

- [ ] **Step 4: Write the failing tokens test**

Create `lib/theme/__tests__/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { CvTheme } from '@/lib/schema/cv'
import { DEFAULT_FONT_PAIR_ID, FONT_PAIRS, getFontPair } from '@/lib/theme/fonts'
import { DENSITY_SCALE, buildThemeTokens, themeTokensToStyle } from '@/lib/theme/tokens'

const theme: CvTheme = {
  templateId: 'oslo',
  accent: '#1e3a8a',
  fontPairId: DEFAULT_FONT_PAIR_ID,
  density: 'normal',
}

describe('font registry', () => {
  it('contains the default pair', () => {
    expect(FONT_PAIRS.some((pair) => pair.id === DEFAULT_FONT_PAIR_ID)).toBe(true)
  })

  it('has unique ids', () => {
    const ids = FONT_PAIRS.map((pair) => pair.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to the default pair for an unknown id', () => {
    expect(getFontPair('does-not-exist').id).toBe(DEFAULT_FONT_PAIR_ID)
  })
})

describe('buildThemeTokens', () => {
  it('uses the theme accent', () => {
    expect(buildThemeTokens(theme).accent).toBe('#1e3a8a')
  })

  it('derives readable accent ink', () => {
    expect(buildThemeTokens(theme).accentInk).toBe('#ffffff')
    expect(buildThemeTokens({ ...theme, accent: '#ffe600' }).accentInk).toBe('#111111')
  })

  it('maps density onto a numeric scale', () => {
    expect(buildThemeTokens({ ...theme, density: 'compact' }).scale)
      .toBe(DENSITY_SCALE.compact)
    expect(buildThemeTokens({ ...theme, density: 'roomy' }).scale)
      .toBe(DENSITY_SCALE.roomy)
  })

  it('resolves the font pair into font stacks', () => {
    const tokens = buildThemeTokens(theme)
    expect(tokens.fontBody).toContain('Inter')
  })

  it('lets a template override base tokens', () => {
    const tokens = buildThemeTokens(theme, { ink: '#000000', rule: '#dddddd' })
    expect(tokens.ink).toBe('#000000')
    expect(tokens.rule).toBe('#dddddd')
  })

  it('lets a template override the derived accent ink', () => {
    expect(buildThemeTokens(theme, { accentInk: '#ff0000' }).accentInk).toBe('#ff0000')
  })
})

describe('themeTokensToStyle', () => {
  it('emits cv-prefixed custom properties', () => {
    const style = themeTokensToStyle(buildThemeTokens(theme))
    expect(style['--cv-accent']).toBe('#1e3a8a')
    expect(style['--cv-accent-ink']).toBe('#ffffff')
    expect(style['--cv-scale']).toBe('1')
  })

  it('emits every token', () => {
    const style = themeTokensToStyle(buildThemeTokens(theme))
    expect(Object.keys(style).sort()).toEqual([
      '--cv-accent',
      '--cv-accent-ink',
      '--cv-font-body',
      '--cv-font-head',
      '--cv-ink',
      '--cv-muted',
      '--cv-rule',
      '--cv-scale',
      '--cv-surface',
    ])
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `bun run test lib/theme/__tests__/tokens.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/theme/fonts"`.

- [ ] **Step 6: Write the font registry**

Create `lib/theme/fonts.ts`:

```ts
export type FontPair = {
  id: string
  name: string
  /** CSS font stack for headings. */
  head: string
  /** CSS font stack for body copy. */
  body: string
}

/**
 * Font families available to CV templates. Every family here must be
 * self-hosted with an @font-face rule in `public/cv/fonts.css`, because the
 * print iframe is a separate document and cannot see next/font's stylesheet.
 * More pairings land alongside the templates that need them.
 */
export const FONT_PAIRS: FontPair[] = [
  {
    id: 'inter',
    name: 'Inter',
    head: "'Inter', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
  },
]

export const DEFAULT_FONT_PAIR_ID = 'inter'

export function getFontPair(id: string): FontPair {
  return (
    FONT_PAIRS.find((pair) => pair.id === id) ??
    FONT_PAIRS.find((pair) => pair.id === DEFAULT_FONT_PAIR_ID)!
  )
}
```

- [ ] **Step 7: Write the token builder**

Create `lib/theme/tokens.ts`:

```ts
import type { CSSProperties } from 'react'
import type { CvTheme, Density } from '@/lib/schema/cv'
import { pickInk } from './contrast'
import { getFontPair } from './fonts'

export const DENSITY_SCALE: Record<Density, number> = {
  compact: 0.92,
  normal: 1,
  roomy: 1.08,
}

export type ThemeTokenValues = {
  accent: string
  accentInk: string
  ink: string
  muted: string
  rule: string
  surface: string
  scale: number
  fontHead: string
  fontBody: string
}

/** Neutral defaults a template may override. */
export const BASE_TOKENS = {
  ink: '#111111',
  muted: '#5b6472',
  rule: '#d8dde5',
  surface: '#ffffff',
} as const

export type CvThemeStyle = CSSProperties & Record<`--cv-${string}`, string>

export function buildThemeTokens(
  theme: CvTheme,
  overrides: Partial<ThemeTokenValues> = {},
): ThemeTokenValues {
  const fontPair = getFontPair(theme.fontPairId)
  const accent = overrides.accent ?? theme.accent

  return {
    accent,
    accentInk: overrides.accentInk ?? pickInk(accent),
    ink: overrides.ink ?? BASE_TOKENS.ink,
    muted: overrides.muted ?? BASE_TOKENS.muted,
    rule: overrides.rule ?? BASE_TOKENS.rule,
    surface: overrides.surface ?? BASE_TOKENS.surface,
    scale: overrides.scale ?? DENSITY_SCALE[theme.density],
    fontHead: overrides.fontHead ?? fontPair.head,
    fontBody: overrides.fontBody ?? fontPair.body,
  }
}

export function themeTokensToStyle(tokens: ThemeTokenValues): CvThemeStyle {
  return {
    '--cv-accent': tokens.accent,
    '--cv-accent-ink': tokens.accentInk,
    '--cv-ink': tokens.ink,
    '--cv-muted': tokens.muted,
    '--cv-rule': tokens.rule,
    '--cv-surface': tokens.surface,
    '--cv-scale': String(tokens.scale),
    '--cv-font-head': tokens.fontHead,
    '--cv-font-body': tokens.fontBody,
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `bun run test lib/theme`
Expected: PASS — 13 contrast tests and 11 token tests.

- [ ] **Step 9: Commit**

```bash
git add lib/theme
git commit -m "feat(theme): add WCAG contrast maths and CV theme token builder"
```

---

### Task 10: Paper geometry and page counting

**Files:**
- Create: `lib/print/paper.ts`
- Test: `lib/print/__tests__/paper.test.ts`

**Interfaces:**
- Consumes: `PaperId` from `@/lib/schema/cv`
- Produces:
  - `PAPER: Record<PaperId, { widthMm: number; heightMm: number; cssSize: string }>`
  - `DEFAULT_MARGIN_MM = 16`
  - `mmToPx(mm: number): number`, `pxToMm(px: number): number`
  - `usableHeightMm(paper: PaperId, marginMm?: number): number`
  - `countPages(contentHeightMm: number, paper: PaperId, marginMm?: number): number`
  - `pageBreakOffsetsMm(contentHeightMm: number, paper: PaperId, marginMm?: number): number[]`

`pageBreakOffsetsMm` returns the distances from the top of the content box at which the preview should draw its dashed page-break guides. An offset is measured from the top of the **content**, not the page, so the editor can position guides with a single absolutely-positioned element per break.

- [ ] **Step 1: Write the failing test**

Create `lib/print/__tests__/paper.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MARGIN_MM,
  PAPER,
  countPages,
  mmToPx,
  pageBreakOffsetsMm,
  pxToMm,
  usableHeightMm,
} from '@/lib/print/paper'

describe('PAPER', () => {
  it('uses ISO A4 dimensions', () => {
    expect(PAPER.a4).toMatchObject({ widthMm: 210, heightMm: 297, cssSize: 'A4' })
  })

  it('uses US Letter dimensions', () => {
    expect(PAPER.letter).toMatchObject({ widthMm: 215.9, heightMm: 279.4, cssSize: 'Letter' })
  })
})

describe('unit conversion', () => {
  it('converts one inch to 96 CSS pixels', () => {
    expect(mmToPx(25.4)).toBeCloseTo(96, 6)
  })

  it('round-trips', () => {
    expect(pxToMm(mmToPx(123.4))).toBeCloseTo(123.4, 6)
  })
})

describe('usableHeightMm', () => {
  it('subtracts the margin from both ends', () => {
    expect(usableHeightMm('a4', 16)).toBeCloseTo(297 - 32, 6)
  })

  it('defaults to the standard margin', () => {
    expect(usableHeightMm('a4')).toBeCloseTo(297 - DEFAULT_MARGIN_MM * 2, 6)
  })
})

describe('countPages', () => {
  it('is 1 for empty content', () => {
    expect(countPages(0, 'a4')).toBe(1)
  })

  it('is 1 for content that exactly fills the usable height', () => {
    expect(countPages(usableHeightMm('a4'), 'a4')).toBe(1)
  })

  it('is 2 when content just overflows', () => {
    expect(countPages(usableHeightMm('a4') + 1, 'a4')).toBe(2)
  })

  it('is 3 for content just over two pages', () => {
    expect(countPages(usableHeightMm('a4') * 2 + 1, 'a4')).toBe(3)
  })

  it('accounts for the shorter Letter page', () => {
    const height = usableHeightMm('letter') + 1
    expect(countPages(height, 'letter')).toBe(2)
  })

  it('never returns less than 1 for negative input', () => {
    expect(countPages(-50, 'a4')).toBe(1)
  })
})

describe('pageBreakOffsetsMm', () => {
  it('returns no offsets for a single page', () => {
    expect(pageBreakOffsetsMm(50, 'a4')).toEqual([])
  })

  it('returns one offset for two pages', () => {
    const offsets = pageBreakOffsetsMm(usableHeightMm('a4') + 10, 'a4')
    expect(offsets).toHaveLength(1)
    expect(offsets[0]).toBeCloseTo(usableHeightMm('a4'), 6)
  })

  it('returns evenly spaced offsets for three pages', () => {
    const usable = usableHeightMm('a4')
    const offsets = pageBreakOffsetsMm(usable * 2 + 10, 'a4')
    expect(offsets).toHaveLength(2)
    expect(offsets[1]! - offsets[0]!).toBeCloseTo(usable, 6)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/print`
Expected: FAIL — `Failed to resolve import "@/lib/print/paper"`.

- [ ] **Step 3: Write the implementation**

Create `lib/print/paper.ts`:

```ts
import type { PaperId } from '@/lib/schema/cv'

export const PAPER = {
  a4: { widthMm: 210, heightMm: 297, cssSize: 'A4' },
  letter: { widthMm: 215.9, heightMm: 279.4, cssSize: 'Letter' },
} as const satisfies Record<PaperId, { widthMm: number; heightMm: number; cssSize: string }>

export const DEFAULT_MARGIN_MM = 16

const MM_PER_INCH = 25.4
const CSS_PX_PER_INCH = 96

/** Guards against float noise making a perfectly-filled page count as two. */
const EPSILON_MM = 0.01

export function mmToPx(mm: number): number {
  return (mm / MM_PER_INCH) * CSS_PX_PER_INCH
}

export function pxToMm(px: number): number {
  return (px / CSS_PX_PER_INCH) * MM_PER_INCH
}

export function usableHeightMm(paper: PaperId, marginMm: number = DEFAULT_MARGIN_MM): number {
  return PAPER[paper].heightMm - marginMm * 2
}

export function countPages(
  contentHeightMm: number,
  paper: PaperId,
  marginMm: number = DEFAULT_MARGIN_MM,
): number {
  const usable = usableHeightMm(paper, marginMm)
  if (usable <= 0) return 1
  return Math.max(1, Math.ceil((contentHeightMm - EPSILON_MM) / usable))
}

export function pageBreakOffsetsMm(
  contentHeightMm: number,
  paper: PaperId,
  marginMm: number = DEFAULT_MARGIN_MM,
): number[] {
  const usable = usableHeightMm(paper, marginMm)
  const pages = countPages(contentHeightMm, paper, marginMm)
  return Array.from({ length: pages - 1 }, (_, index) => usable * (index + 1))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test lib/print`
Expected: PASS — 15 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/print/paper.ts lib/print/__tests__/paper.test.ts
git commit -m "feat(print): add A4 and Letter geometry with page-break maths"
```

---

### Task 11: Self-hosted fonts and the CV stylesheet

**Files:**
- Create: `public/fonts/inter-latin-wght-normal.woff2` (copied from the package)
- Create: `public/cv/fonts.css`
- Create: `public/cv/base.css`
- Create: `lib/print/stylesheets.ts`
- Test: `lib/print/__tests__/stylesheets.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `CV_STYLESHEETS: readonly string[]` — the absolute URLs the preview and the print iframe both load, in order.

**Why this exists.** The print iframe is a separate document. Tailwind's stylesheet and `next/font`'s generated `@font-face` rules live in the app document and are invisible to it. So CV rendering depends only on these plain CSS files, served from `public/`, and both the preview and the iframe link to exactly the same URLs. This is what makes preview-equals-print true by construction.

**Class-name contract for Task 12.** Every class the CV components use is defined here:

| Class | Purpose |
|---|---|
| `.cv-doc` | The page surface. Width, min-height, padding and font come from custom properties. |
| `.cv-header` | Personalia block |
| `.cv-header__name` / `.cv-header__title` / `.cv-header__contact` | Name, professional title, contact line |
| `.cv-header__photo` | Portrait, square with a circular mask |
| `.cv-links` / `.cv-links__item` | Row of links under personalia |
| `.cv-section` / `.cv-section__title` / `.cv-section__body` | A section and its heading |
| `.cv-entry` / `.cv-entry__head` / `.cv-entry__role` / `.cv-entry__org` / `.cv-entry__dates` / `.cv-entry__location` | One timeline entry |
| `.cv-bullets` | `<ul>` for a bullets-mode description |
| `.cv-prose` | `<p>` for a prose-mode description |
| `.cv-items` / `.cv-item` / `.cv-item__name` / `.cv-item__level` | Skills and languages |
| `.cv-bar` / `.cv-bar__fill` | The filling level bar |
| `.cv-inline-list` | Comma-joined list, used by interests |

- [ ] **Step 1: Vendor the Inter font file**

```bash
bun add @fontsource-variable/inter
mkdir -p public/fonts
cp node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2 public/fonts/
ls -l public/fonts/inter-latin-wght-normal.woff2
```

Expected: the file exists and is non-empty.

- [ ] **Step 2: Write the failing test**

Create `lib/print/__tests__/stylesheets.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'

const publicDir = join(process.cwd(), 'public')

function readPublic(url: string): string {
  return readFileSync(join(publicDir, url), 'utf8')
}

describe('CV_STYLESHEETS', () => {
  it('lists fonts before the base stylesheet', () => {
    expect(CV_STYLESHEETS).toEqual(['/cv/fonts.css', '/cv/base.css'])
  })

  it('points at files that exist in public/', () => {
    for (const url of CV_STYLESHEETS) {
      expect(existsSync(join(publicDir, url)), `${url} is missing`).toBe(true)
    }
  })

  it('never uses @import, which would not resolve inside the print iframe', () => {
    for (const url of CV_STYLESHEETS) {
      expect(readPublic(url)).not.toContain('@import')
    }
  })
})

describe('fonts.css', () => {
  it('declares the Inter face', () => {
    const css = readPublic('/cv/fonts.css')
    expect(css).toContain('@font-face')
    expect(css).toContain("font-family: 'Inter'")
  })

  it('references a font file that exists', () => {
    const css = readPublic('/cv/fonts.css')
    const matches = [...css.matchAll(/url\('([^']+)'\)/g)].map((match) => match[1]!)
    expect(matches.length).toBeGreaterThan(0)
    for (const url of matches) {
      expect(existsSync(join(publicDir, url)), `${url} is missing`).toBe(true)
    }
  })
})

describe('base.css', () => {
  const css = readPublic('/cv/base.css')

  it('defines the document surface', () => {
    expect(css).toContain('.cv-doc')
  })

  it('keeps entries and items off page boundaries', () => {
    expect(css).toContain('break-inside: avoid')
  })

  it('keeps a section title attached to its body', () => {
    expect(css).toContain('break-after: avoid')
  })

  it('defines every class the renderers rely on', () => {
    for (const className of [
      '.cv-header', '.cv-header__name', '.cv-header__title', '.cv-header__contact',
      '.cv-header__photo', '.cv-links', '.cv-section', '.cv-section__title',
      '.cv-entry', '.cv-entry__head', '.cv-entry__dates', '.cv-bullets', '.cv-prose',
      '.cv-items', '.cv-item', '.cv-bar', '.cv-bar__fill', '.cv-inline-list',
    ]) {
      expect(css, `${className} is not defined`).toContain(className)
    }
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun run test lib/print/__tests__/stylesheets.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/print/stylesheets"`.

- [ ] **Step 4: Write the stylesheet registry**

Create `lib/print/stylesheets.ts`:

```ts
/**
 * Stylesheets that define CV rendering, loaded identically by the on-screen
 * preview and by the print iframe. Order matters: faces before rules.
 *
 * These are plain CSS files in `public/` rather than Tailwind or CSS modules,
 * because the print iframe is a separate document that cannot see the app's
 * bundled styles.
 */
export const CV_STYLESHEETS = ['/cv/fonts.css', '/cv/base.css'] as const
```

- [ ] **Step 5: Write the font stylesheet**

Create `public/cv/fonts.css`:

```css
/* Self-hosted so the print iframe has real fonts and the app makes no
   third-party requests. Add a face here whenever lib/theme/fonts.ts gains a pair. */

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: block;
  src: url('/fonts/inter-latin-wght-normal.woff2') format('woff2-variations');
}
```

- [ ] **Step 6: Write the base CV stylesheet**

Create `public/cv/base.css`:

```css
/* CV document styles. Loaded by the preview and by the print iframe.
   All layout is in mm or pt so the screen and the printed page agree.
   Custom properties are supplied inline by <CvDocument>. */

.cv-doc {
  box-sizing: border-box;
  width: var(--cv-page-width);
  min-height: var(--cv-page-height);
  padding: var(--cv-margin);
  margin: 0;
  background: var(--cv-surface);
  color: var(--cv-ink);
  font-family: var(--cv-font-body);
  font-size: calc(9.8pt * var(--cv-scale));
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cv-doc * {
  box-sizing: border-box;
}

.cv-doc p,
.cv-doc ul,
.cv-doc h1,
.cv-doc h2,
.cv-doc h3 {
  margin: 0;
  padding: 0;
}

.cv-doc ul {
  list-style: none;
}

/* Personalia */

.cv-header {
  display: flex;
  gap: calc(6mm * var(--cv-scale));
  align-items: center;
  margin-bottom: calc(7mm * var(--cv-scale));
}

.cv-header__body {
  flex: 1 1 auto;
  min-width: 0;
}

.cv-header__name {
  font-family: var(--cv-font-head);
  font-size: calc(21pt * var(--cv-scale));
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.cv-header__title {
  margin-top: calc(1.5mm * var(--cv-scale));
  font-size: calc(11pt * var(--cv-scale));
  color: var(--cv-accent);
  font-weight: 600;
}

.cv-header__contact {
  margin-top: calc(2.5mm * var(--cv-scale));
  color: var(--cv-muted);
  font-size: calc(8.8pt * var(--cv-scale));
}

.cv-header__photo {
  flex: 0 0 auto;
  width: calc(26mm * var(--cv-scale));
  height: calc(26mm * var(--cv-scale));
  border-radius: 50%;
  object-fit: cover;
}

.cv-links {
  display: flex;
  flex-wrap: wrap;
  gap: calc(1mm * var(--cv-scale)) calc(4mm * var(--cv-scale));
  margin-top: calc(2mm * var(--cv-scale));
  font-size: calc(8.8pt * var(--cv-scale));
}

.cv-links__item {
  color: var(--cv-accent);
  text-decoration: none;
}

/* Sections */

.cv-section {
  margin-bottom: calc(6mm * var(--cv-scale));
}

.cv-section__title {
  font-family: var(--cv-font-head);
  font-size: calc(10.5pt * var(--cv-scale));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cv-accent);
  padding-bottom: calc(1.2mm * var(--cv-scale));
  border-bottom: 0.35mm solid var(--cv-rule);
  margin-bottom: calc(3mm * var(--cv-scale));
  break-after: avoid;
  page-break-after: avoid;
}

.cv-section__body {
  display: block;
}

/* Timeline entries */

.cv-entry {
  margin-bottom: calc(4mm * var(--cv-scale));
  break-inside: avoid;
  page-break-inside: avoid;
}

.cv-entry:last-child {
  margin-bottom: 0;
}

.cv-entry__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: calc(4mm * var(--cv-scale));
}

.cv-entry__role {
  font-weight: 700;
  font-size: calc(10.5pt * var(--cv-scale));
}

.cv-entry__org {
  color: var(--cv-muted);
  font-size: calc(9.4pt * var(--cv-scale));
}

.cv-entry__dates,
.cv-entry__location {
  flex: 0 0 auto;
  color: var(--cv-muted);
  font-size: calc(8.8pt * var(--cv-scale));
  white-space: nowrap;
}

.cv-bullets {
  margin-top: calc(1.5mm * var(--cv-scale));
  padding-left: calc(4.5mm * var(--cv-scale));
}

.cv-bullets li {
  position: relative;
  margin-bottom: calc(0.8mm * var(--cv-scale));
}

.cv-bullets li::before {
  content: '•';
  position: absolute;
  left: calc(-3.5mm * var(--cv-scale));
  color: var(--cv-accent);
}

.cv-prose {
  margin-top: calc(1.5mm * var(--cv-scale));
  white-space: pre-line;
}

/* Skills, languages and other item lists */

.cv-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(1.6mm * var(--cv-scale)) calc(6mm * var(--cv-scale));
}

.cv-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(3mm * var(--cv-scale));
  break-inside: avoid;
  page-break-inside: avoid;
}

.cv-item__name {
  min-width: 0;
}

.cv-item__level {
  flex: 0 0 auto;
  color: var(--cv-muted);
  font-size: calc(8.6pt * var(--cv-scale));
  white-space: nowrap;
}

.cv-bar {
  flex: 0 0 auto;
  width: calc(22mm * var(--cv-scale));
  height: calc(1.6mm * var(--cv-scale));
  border-radius: 1mm;
  background: var(--cv-rule);
  overflow: hidden;
}

.cv-bar__fill {
  display: block;
  height: 100%;
  border-radius: 1mm;
  background: var(--cv-accent);
}

.cv-inline-list {
  display: block;
}

@media print {
  .cv-doc {
    min-height: 0;
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `bun run test lib/print`
Expected: PASS — the paper tests plus 8 stylesheet tests.

- [ ] **Step 8: Commit**

```bash
git add public/fonts public/cv lib/print/stylesheets.ts lib/print/__tests__/stylesheets.test.ts package.json bun.lock
git commit -m "feat(cv): add self-hosted Inter and the shared CV stylesheet"
```

---

### Task 12: Shared section renderers

**Files:**
- Create: `components/cv/types.ts`
- Create: `components/cv/sections/SectionFrame.tsx`
- Create: `components/cv/sections/Description.tsx`
- Create: `components/cv/sections/LevelBar.tsx`
- Create: `components/cv/sections/renderers.tsx`
- Create: `components/cv/sections/index.ts`
- Test: `components/cv/__tests__/sections.test.tsx`

**Interfaces:**
- Consumes: `Section`, `SectionType`, `SkillLevel`, `LanguageLevel` from `@/lib/schema/cv`; `CvLabels` from `@/lib/cv-labels`; `formatDateRange` from `@/lib/cv-labels/format`; `ThemeTokenValues` from `@/lib/theme/tokens`
- Produces:
  - `type ShellId = 'single' | 'sidebar-left' | 'sidebar-right' | 'header-band'`
  - `type LevelDisplay = 'bar' | 'text'`
  - `type RenderContext = { labels: CvLabels; levelDisplay: LevelDisplay }`
  - `type SectionRenderer = (props: { section: Section; context: RenderContext }) => ReactNode`
  - `type Template` (consumed by Task 13)
  - `sectionTitle(section: Section, labels: CvLabels): string`
  - `SECTION_RENDERERS: Record<SectionType, SectionRenderer>`
  - `renderSection(section, context, overrides?): ReactNode`

**Behavioural contract, relied on by Task 13:** a renderer returns `null` when its section has no content, so an enabled-but-empty section never prints a bare heading. The one deliberate exception is `references`, which falls back to the "references available on request" line.

- [ ] **Step 1: Write the failing test**

Create `components/cv/__tests__/sections.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getCvLabels } from '@/lib/cv-labels'
import type { Section } from '@/lib/schema/cv'
import type { LevelDisplay, RenderContext } from '@/components/cv/types'
import { renderSection, sectionTitle } from '@/components/cv/sections'

function context(language: 'no' | 'en' = 'no', levelDisplay: LevelDisplay = 'bar'): RenderContext {
  return { labels: getCvLabels(language), levelDisplay }
}

function draw(section: Section, ctx: RenderContext = context()) {
  return render(<div>{renderSection(section, ctx)}</div>)
}

describe('sectionTitle', () => {
  it('uses the localized label', () => {
    const section: Section = { id: 's', type: 'experience', enabled: true, entries: [] }
    expect(sectionTitle(section, getCvLabels('no'))).toBe('Arbeidserfaring')
    expect(sectionTitle(section, getCvLabels('en'))).toBe('Work Experience')
  })

  it('prefers a per-CV override', () => {
    const section: Section = {
      id: 's', type: 'experience', enabled: true, entries: [], titleOverride: 'Relevant erfaring',
    }
    expect(sectionTitle(section, getCvLabels('no'))).toBe('Relevant erfaring')
  })

  it('uses the custom section title', () => {
    const section: Section = {
      id: 's', type: 'custom', enabled: true, title: 'Publikasjoner', shape: 'bullets', bullets: ['A'],
    }
    expect(sectionTitle(section, getCvLabels('no'))).toBe('Publikasjoner')
  })
})

describe('summary', () => {
  it('renders the heading and the text', () => {
    draw({ id: 's', type: 'summary', enabled: true, text: 'Erfaren utvikler.' })
    expect(screen.getByText('Om meg')).toBeInTheDocument()
    expect(screen.getByText('Erfaren utvikler.')).toBeInTheDocument()
  })

  it('renders nothing when empty', () => {
    const { container } = draw({ id: 's', type: 'summary', enabled: true, text: '   ' })
    expect(container).toBeEmptyDOMElement()
  })
})

describe('timeline sections', () => {
  const entry = {
    id: 'e1',
    role: 'Utvikler',
    organisation: 'Acme AS',
    location: 'Oslo',
    from: '2022-01',
    to: '',
    current: true,
    descriptionMode: 'bullets' as const,
  }

  it('renders role, organisation and formatted dates', () => {
    draw({ id: 's', type: 'experience', enabled: true, entries: [entry] })
    expect(screen.getByText('Utvikler')).toBeInTheDocument()
    expect(screen.getByText(/Acme AS/)).toBeInTheDocument()
    expect(screen.getByText('jan. 2022 – nå')).toBeInTheDocument()
  })

  it('renders one bullet per non-empty line in bullets mode', () => {
    draw({
      id: 's',
      type: 'experience',
      enabled: true,
      entries: [{ ...entry, description: 'Ledet team\n\nKuttet lastetid\n' }],
    })
    const bullets = screen.getAllByRole('listitem')
    expect(bullets).toHaveLength(2)
    expect(bullets[0]).toHaveTextContent('Ledet team')
    expect(bullets[1]).toHaveTextContent('Kuttet lastetid')
  })

  it('renders a paragraph and no bullets in prose mode', () => {
    const { container } = draw({
      id: 's',
      type: 'experience',
      enabled: true,
      entries: [{ ...entry, description: 'Ledet team\nKuttet lastetid', descriptionMode: 'prose' }],
    })
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(container.querySelector('.cv-prose')).toHaveTextContent('Ledet team')
  })

  it('renders nothing when there are no entries', () => {
    const { container } = draw({ id: 's', type: 'education', enabled: true, entries: [] })
    expect(container).toBeEmptyDOMElement()
  })
})

describe('skills', () => {
  const section: Section = {
    id: 's',
    type: 'skills',
    enabled: true,
    items: [
      { id: 'i1', name: 'TypeScript', level: 4 },
      { id: 'i2', name: 'Rust' },
    ],
  }

  it('renders a labelled bar when the template asks for bars', () => {
    const { container } = draw(section, context('no', 'bar'))
    expect(screen.getByLabelText('Avansert')).toBeInTheDocument()
    expect(container.querySelectorAll('.cv-bar')).toHaveLength(1)
  })

  it('renders the level word instead when the template asks for text', () => {
    const { container } = draw(section, context('no', 'text'))
    expect(screen.getByText('Avansert')).toBeInTheDocument()
    expect(container.querySelectorAll('.cv-bar')).toHaveLength(0)
  })

  it('renders an item with no level and no bar', () => {
    const { container } = draw(section, context('no', 'bar'))
    expect(screen.getByText('Rust')).toBeInTheDocument()
    expect(container.querySelectorAll('.cv-bar')).toHaveLength(1)
  })

  it('fills the bar proportionally to the level', () => {
    const { container } = draw(section, context('no', 'bar'))
    const fill = container.querySelector('.cv-bar__fill') as HTMLElement
    expect(fill.style.width).toBe('80%')
  })
})

describe('languages', () => {
  it('uses the CEFR scale and its own fill fraction', () => {
    const { container } = draw(
      {
        id: 's',
        type: 'languages',
        enabled: true,
        items: [
          { id: 'i1', name: 'Norsk', level: 'native' },
          { id: 'i2', name: 'Engelsk', level: 'c1' },
        ],
      },
      context('no', 'bar'),
    )
    expect(screen.getByLabelText('Morsmål')).toBeInTheDocument()
    const fills = container.querySelectorAll('.cv-bar__fill')
    expect((fills[0] as HTMLElement).style.width).toBe('100%')
    expect((fills[1] as HTMLElement).style.width).not.toBe('100%')
  })
})

describe('references', () => {
  it('renders the on-request line when there are no entries', () => {
    draw({ id: 's', type: 'references', enabled: true, entries: [] })
    expect(screen.getByText('Referanser oppgis ved forespørsel')).toBeInTheDocument()
  })

  it('renders referees when there are entries', () => {
    draw({
      id: 's',
      type: 'references',
      enabled: true,
      entries: [{
        id: 'r1', name: 'Kari Nordmann', role: 'Teamleder',
        organisation: 'Acme AS', email: 'kari@acme.no', phone: '+47 900 00 000',
      }],
    })
    expect(screen.getByText('Kari Nordmann')).toBeInTheDocument()
    expect(screen.queryByText('Referanser oppgis ved forespørsel')).not.toBeInTheDocument()
  })
})

describe('interests and driving licence', () => {
  it('joins interests into one line', () => {
    draw({ id: 's', type: 'interests', enabled: true, items: ['Klatring', 'Fotografi'] })
    expect(screen.getByText('Klatring · Fotografi')).toBeInTheDocument()
  })

  it('renders driving licence classes', () => {
    draw({ id: 's', type: 'drivingLicence', enabled: true, classes: ['B', 'BE'] })
    expect(screen.getByText('Klasse B, BE')).toBeInTheDocument()
  })

  it('renders nothing for an empty driving licence section', () => {
    const { container } = draw({ id: 's', type: 'drivingLicence', enabled: true, classes: [] })
    expect(container).toBeEmptyDOMElement()
  })
})

describe('custom sections', () => {
  it('renders the bullets shape', () => {
    draw({
      id: 's', type: 'custom', enabled: true, title: 'Publikasjoner',
      shape: 'bullets', bullets: ['En artikkel', 'En til'],
    })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders the text shape', () => {
    draw({
      id: 's', type: 'custom', enabled: true, title: 'Notat',
      shape: 'text', text: 'Fritekst her.',
    })
    expect(screen.getByText('Fritekst her.')).toBeInTheDocument()
  })

  it('renders nothing when the chosen shape has no content', () => {
    const { container } = draw({
      id: 's', type: 'custom', enabled: true, title: 'Tom', shape: 'bullets', bullets: [],
    })
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test components/cv`
Expected: FAIL — `Failed to resolve import "@/components/cv/types"`.

- [ ] **Step 3: Write the shared types**

Create `components/cv/types.ts`:

```ts
import type { ReactNode } from 'react'
import type { CvLabels } from '@/lib/cv-labels'
import type { Section, SectionType } from '@/lib/schema/cv'
import type { ThemeTokenValues } from '@/lib/theme/tokens'

export type ShellId = 'single' | 'sidebar-left' | 'sidebar-right' | 'header-band'

/** Whether skill and language levels render as a bar or as a word. */
export type LevelDisplay = 'bar' | 'text'

export type RenderContext = {
  labels: CvLabels
  levelDisplay: LevelDisplay
}

export type SectionRendererProps = {
  section: Section
  context: RenderContext
}

export type SectionRenderer = (props: SectionRendererProps) => ReactNode

export type Template = {
  id: string
  /** Display name in the template gallery. Not localized: these are proper names. */
  name: string
  shell: ShellId
  defaultAccent: string
  /** Curated accents offered for this template, before the colour picker. */
  swatches: string[]
  levelDisplay: LevelDisplay
  /** Token overrides layered on top of the neutral defaults. */
  tokens?: Partial<ThemeTokenValues>
  /** For sidebar shells: which sections live in the sidebar. */
  sidebarSections?: SectionType[]
  /** Escape hatch for a template that needs a bespoke renderer. */
  overrides?: Partial<Record<SectionType, SectionRenderer>>
}
```

- [ ] **Step 4: Write the section frame**

Create `components/cv/sections/SectionFrame.tsx`:

```tsx
import type { ReactNode } from 'react'

export function SectionFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="cv-section">
      <h2 className="cv-section__title">{title}</h2>
      <div className="cv-section__body">{children}</div>
    </section>
  )
}
```

- [ ] **Step 5: Write the description renderer**

Create `components/cv/sections/Description.tsx`:

```tsx
/** Splits a textarea value into bullets, dropping blank lines. */
export function toBullets(description: string): string[] {
  return description
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function Description({
  description,
  mode,
}: {
  description: string | undefined
  mode: 'bullets' | 'prose'
}) {
  const value = description?.trim()
  if (!value) return null

  if (mode === 'prose') {
    return <p className="cv-prose">{value}</p>
  }

  const bullets = toBullets(value)
  if (bullets.length === 0) return null

  return (
    <ul className="cv-bullets">
      {bullets.map((bullet, index) => (
        <li key={`${index}-${bullet}`}>{bullet}</li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6: Write the level bar**

Create `components/cv/sections/LevelBar.tsx`:

```tsx
import type { LevelDisplay } from '@/components/cv/types'

export function LevelBar({
  fraction,
  label,
  display,
}: {
  /** 0–1. */
  fraction: number
  label: string
  display: LevelDisplay
}) {
  if (display === 'text') {
    return <span className="cv-item__level">{label}</span>
  }

  const width = `${Math.round(Math.min(Math.max(fraction, 0), 1) * 100)}%`

  return (
    <span className="cv-bar" role="img" aria-label={label}>
      <span className="cv-bar__fill" style={{ width }} />
    </span>
  )
}
```

- [ ] **Step 7: Write the renderers**

Create `components/cv/sections/renderers.tsx`:

```tsx
import type { CvLabels } from '@/lib/cv-labels'
import { formatDateRange, formatMonthYear } from '@/lib/cv-labels/format'
import type {
  LanguageLevel,
  Section,
  SectionType,
  TimelineEntry,
} from '@/lib/schema/cv'
import type { RenderContext, SectionRenderer } from '@/components/cv/types'
import { Description } from './Description'
import { LevelBar } from './LevelBar'
import { SectionFrame } from './SectionFrame'

export function sectionTitle(section: Section, labels: CvLabels): string {
  if (section.titleOverride?.trim()) return section.titleOverride.trim()
  if (section.type === 'custom') return section.title
  return labels.sections[section.type]
}

const LANGUAGE_LEVEL_ORDER: LanguageLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native']

function languageFraction(level: LanguageLevel): number {
  return (LANGUAGE_LEVEL_ORDER.indexOf(level) + 1) / LANGUAGE_LEVEL_ORDER.length
}

function TimelineEntryView({ entry, context }: { entry: TimelineEntry; context: RenderContext }) {
  const dates = formatDateRange(entry.from, entry.to, entry.current, context.labels)
  const org = [entry.organisation, entry.location].filter(Boolean).join(' · ')

  return (
    <article className="cv-entry">
      <div className="cv-entry__head">
        <div>
          <div className="cv-entry__role">{entry.role}</div>
          {org ? <div className="cv-entry__org">{org}</div> : null}
        </div>
        {dates ? <div className="cv-entry__dates">{dates}</div> : null}
      </div>
      <Description description={entry.description} mode={entry.descriptionMode} />
    </article>
  )
}

const timelineRenderer: SectionRenderer = ({ section, context }) => {
  if (!('entries' in section) || !section.entries || section.entries.length === 0) return null

  return (
    <SectionFrame title={sectionTitle(section, context.labels)}>
      {section.entries.map((entry) => (
        <TimelineEntryView key={entry.id} entry={entry} context={context} />
      ))}
    </SectionFrame>
  )
}

export const SECTION_RENDERERS: Record<SectionType, SectionRenderer> = {
  summary: ({ section, context }) => {
    if (section.type !== 'summary') return null
    const text = section.text.trim()
    if (!text) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <p className="cv-prose">{text}</p>
      </SectionFrame>
    )
  },

  experience: timelineRenderer,
  education: timelineRenderer,
  projects: timelineRenderer,
  volunteering: timelineRenderer,
  courses: timelineRenderer,

  skills: ({ section, context }) => {
    if (section.type !== 'skills' || section.items.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <ul className="cv-items">
          {section.items.map((item) => (
            <li className="cv-item" key={item.id}>
              <span className="cv-item__name">{item.name}</span>
              {item.level ? (
                <LevelBar
                  fraction={item.level / 5}
                  label={context.labels.skillLevels[item.level]}
                  display={context.levelDisplay}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </SectionFrame>
    )
  },

  languages: ({ section, context }) => {
    if (section.type !== 'languages' || section.items.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <ul className="cv-items">
          {section.items.map((item) => (
            <li className="cv-item" key={item.id}>
              <span className="cv-item__name">{item.name}</span>
              {item.level ? (
                <LevelBar
                  fraction={languageFraction(item.level)}
                  label={context.labels.languageLevels[item.level]}
                  display={context.levelDisplay}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </SectionFrame>
    )
  },

  certifications: ({ section, context }) => {
    if (section.type !== 'certifications' || section.entries.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        {section.entries.map((entry) => (
          <article className="cv-entry" key={entry.id}>
            <div className="cv-entry__head">
              <div>
                <div className="cv-entry__role">{entry.name}</div>
                {entry.issuer ? <div className="cv-entry__org">{entry.issuer}</div> : null}
              </div>
              {entry.date ? (
                <div className="cv-entry__dates">
                  {formatMonthYear(entry.date, context.labels)}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </SectionFrame>
    )
  },

  references: ({ section, context }) => {
    if (section.type !== 'references') return null

    if (section.entries.length === 0) {
      return (
        <SectionFrame title={sectionTitle(section, context.labels)}>
          <p className="cv-prose">{context.labels.referencesOnRequest}</p>
        </SectionFrame>
      )
    }

    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        {section.entries.map((entry) => (
          <article className="cv-entry" key={entry.id}>
            <div className="cv-entry__role">{entry.name}</div>
            <div className="cv-entry__org">
              {[entry.role, entry.organisation].filter(Boolean).join(' · ')}
            </div>
            <div className="cv-entry__org">
              {[entry.email, entry.phone].filter(Boolean).join(' · ')}
            </div>
          </article>
        ))}
      </SectionFrame>
    )
  },

  interests: ({ section, context }) => {
    if (section.type !== 'interests') return null
    const items = section.items.map((item) => item.trim()).filter(Boolean)
    if (items.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <p className="cv-inline-list">{items.join(' · ')}</p>
      </SectionFrame>
    )
  },

  drivingLicence: ({ section, context }) => {
    if (section.type !== 'drivingLicence') return null
    const classes = section.classes.map((value) => value.trim()).filter(Boolean)
    if (classes.length === 0) return null
    return (
      <SectionFrame title={sectionTitle(section, context.labels)}>
        <p className="cv-inline-list">
          {`${context.labels.drivingLicenceClass} ${classes.join(', ')}`}
        </p>
        {section.note ? <p className="cv-prose">{section.note}</p> : null}
      </SectionFrame>
    )
  },

  custom: ({ section, context }) => {
    if (section.type !== 'custom') return null
    const title = sectionTitle(section, context.labels)

    if (section.shape === 'entries') {
      if (!section.entries || section.entries.length === 0) return null
      return (
        <SectionFrame title={title}>
          {section.entries.map((entry) => (
            <TimelineEntryView key={entry.id} entry={entry} context={context} />
          ))}
        </SectionFrame>
      )
    }

    if (section.shape === 'bullets') {
      const bullets = (section.bullets ?? []).map((b) => b.trim()).filter(Boolean)
      if (bullets.length === 0) return null
      return (
        <SectionFrame title={title}>
          <ul className="cv-bullets">
            {bullets.map((bullet, index) => (
              <li key={`${index}-${bullet}`}>{bullet}</li>
            ))}
          </ul>
        </SectionFrame>
      )
    }

    const text = section.text?.trim()
    if (!text) return null
    return (
      <SectionFrame title={title}>
        <p className="cv-prose">{text}</p>
      </SectionFrame>
    )
  },
}
```

- [ ] **Step 8: Write the registry entry point**

Create `components/cv/sections/index.ts`:

```ts
import type { ReactNode } from 'react'
import type { Section, SectionType } from '@/lib/schema/cv'
import type { RenderContext, SectionRenderer } from '@/components/cv/types'
import { SECTION_RENDERERS, sectionTitle } from './renderers'

export { SECTION_RENDERERS, sectionTitle }
export { Description, toBullets } from './Description'
export { LevelBar } from './LevelBar'
export { SectionFrame } from './SectionFrame'

export function renderSection(
  section: Section,
  context: RenderContext,
  overrides?: Partial<Record<SectionType, SectionRenderer>>,
): ReactNode {
  const renderer = overrides?.[section.type] ?? SECTION_RENDERERS[section.type]
  return renderer({ section, context })
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `bun run test components/cv`
Expected: PASS — 21 tests.

- [ ] **Step 10: Verify types**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add components/cv lib
git commit -m "feat(cv): add shared section renderers with bar and text level display"
```

---

### Task 13: Personalia header, single-column shell, oslo template, document assembly

**Files:**
- Create: `components/cv/PersonaliaHeader.tsx`
- Create: `components/cv/shells/SingleColumn.tsx`
- Create: `components/cv/templates/oslo.ts`
- Create: `components/cv/templates/index.ts`
- Create: `components/cv/CvDocument.tsx`
- Test: `components/cv/__tests__/cv-document.test.tsx`

**Interfaces:**
- Consumes: `renderSection` from `@/components/cv/sections`; `Template`, `ShellId`, `RenderContext` from `@/components/cv/types`; `buildThemeTokens`, `themeTokensToStyle`, `CvThemeStyle` from `@/lib/theme/tokens`; `PAPER`, `DEFAULT_MARGIN_MM` from `@/lib/print/paper`; `getCvLabels` from `@/lib/cv-labels`
- Produces:
  - `PersonaliaHeader({ personalia }): ReactNode`
  - `SingleColumn({ header, sections }): ReactNode`
  - `TEMPLATES: Template[]`, `DEFAULT_TEMPLATE_ID = 'oslo'`, `getTemplate(id: string): Template`
  - `CvDocument({ document, className }): ReactNode` — the root `.cv-doc` element carrying every custom property
  - `CV_DOC_CLASS = 'cv-doc'`
- Note for Task 14: the print pipeline clones the DOM node rendered by `CvDocument`, so every style it needs must be either in `public/cv/base.css` or an inline custom property on this root element. Nothing may come from a parent.

- [ ] **Step 1: Write the failing test**

Create `components/cv/__tests__/cv-document.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CvDocument } from '@/components/cv/CvDocument'
import { DEFAULT_TEMPLATE_ID, TEMPLATES, getTemplate } from '@/components/cv/templates'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'

function fixture(overrides: Partial<CvDocumentData> = {}): CvDocumentData {
  let counter = 0
  const base = createEmptyDocument(
    {},
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )
  return { ...base, ...overrides }
}

function withPersonalia(overrides: Partial<CvDocumentData['personalia']>): CvDocumentData {
  const doc = fixture()
  return { ...doc, personalia: { ...doc.personalia, ...overrides } }
}

function root(container: HTMLElement): HTMLElement {
  return container.querySelector('.cv-doc') as HTMLElement
}

describe('template registry', () => {
  it('contains the default template', () => {
    expect(TEMPLATES.some((t) => t.id === DEFAULT_TEMPLATE_ID)).toBe(true)
  })

  it('has unique template ids', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to the default for an unknown id', () => {
    expect(getTemplate('nope').id).toBe(DEFAULT_TEMPLATE_ID)
  })

  it('gives every template at least one swatch', () => {
    for (const template of TEMPLATES) {
      expect(template.swatches.length, `${template.id} has no swatches`).toBeGreaterThan(0)
    }
  })
})

describe('CvDocument', () => {
  it('renders the name and professional title', () => {
    const doc = withPersonalia({ firstName: 'Ola', lastName: 'Nordmann', title: 'Utvikler' })
    render(<CvDocument document={doc} />)
    expect(screen.getByText('Ola Nordmann')).toBeInTheDocument()
    expect(screen.getByText('Utvikler')).toBeInTheDocument()
  })

  it('joins contact details into one line', () => {
    const doc = withPersonalia({
      email: 'ola@example.no', phone: '+47 900 00 000', city: 'Oslo', country: 'Norge',
    })
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-header__contact')).toHaveTextContent(
      'ola@example.no · +47 900 00 000 · Oslo, Norge',
    )
  })

  it('renders links', () => {
    const doc = withPersonalia({
      links: [{ id: 'l1', label: 'GitHub', url: 'https://github.com/ola' }],
    })
    render(<CvDocument document={doc} />)
    expect(screen.getByText('GitHub')).toHaveAttribute('href', 'https://github.com/ola')
  })

  it('omits the photo when showPhoto is false', () => {
    const doc = withPersonalia({ showPhoto: false, photo: { dataUrl: 'data:image/png;base64,AA' } })
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-header__photo')).toBeNull()
  })

  it('omits the photo when showPhoto is true but none is set', () => {
    const doc = withPersonalia({ showPhoto: true, photo: undefined })
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-header__photo')).toBeNull()
  })

  it('renders the photo when one is set and shown', () => {
    const doc = withPersonalia({ showPhoto: true, photo: { dataUrl: 'data:image/png;base64,AA' } })
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-header__photo')).toHaveAttribute(
      'src', 'data:image/png;base64,AA',
    )
  })

  it('renders enabled sections and skips disabled ones', () => {
    const doc = fixture()
    doc.sections = doc.sections.map((section) =>
      section.type === 'summary'
        ? { ...section, enabled: true, text: 'Synlig' }
        : section.type === 'education'
          ? { ...section, enabled: false }
          : section,
    )
    render(<CvDocument document={doc} />)
    expect(screen.getByText('Synlig')).toBeInTheDocument()
    expect(screen.queryByText('Utdanning')).not.toBeInTheDocument()
  })

  it('renders sections in document order', () => {
    const doc = fixture()
    const summary = doc.sections.find((s) => s.type === 'summary')!
    const skills = doc.sections.find((s) => s.type === 'skills')!
    doc.sections = [
      { ...skills, enabled: true, items: [{ id: 'i1', name: 'TypeScript' }] },
      { ...summary, enabled: true, text: 'Om meg-tekst' },
    ]
    const { container } = render(<CvDocument document={doc} />)
    const titles = [...container.querySelectorAll('.cv-section__title')].map((n) => n.textContent)
    expect(titles).toEqual(['Ferdigheter', 'Om meg'])
  })

  it('uses the CV language, not the UI language, for section titles', () => {
    const doc = fixture({ language: 'en' })
    doc.sections = doc.sections.map((s) =>
      s.type === 'summary' ? { ...s, enabled: true, text: 'About me' } : { ...s, enabled: false },
    )
    render(<CvDocument document={doc} />)
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('writes theme custom properties onto the root element', () => {
    const doc = fixture()
    doc.theme = { ...doc.theme, accent: '#1e3a8a', density: 'compact' }
    const { container } = render(<CvDocument document={doc} />)
    const style = root(container).style
    expect(style.getPropertyValue('--cv-accent')).toBe('#1e3a8a')
    expect(style.getPropertyValue('--cv-accent-ink')).toBe('#ffffff')
    expect(style.getPropertyValue('--cv-scale')).toBe('0.92')
  })

  it('writes A4 page geometry onto the root element', () => {
    const { container } = render(<CvDocument document={fixture({ paper: 'a4' })} />)
    expect(root(container).style.getPropertyValue('--cv-page-width')).toBe('210mm')
    expect(root(container).style.getPropertyValue('--cv-page-height')).toBe('297mm')
  })

  it('writes Letter page geometry onto the root element', () => {
    const { container } = render(<CvDocument document={fixture({ paper: 'letter' })} />)
    expect(root(container).style.getPropertyValue('--cv-page-width')).toBe('215.9mm')
  })

  it('renders oslo skill levels as words, because oslo is the ATS-strict template', () => {
    const doc = fixture()
    doc.theme = { ...doc.theme, templateId: 'oslo' }
    doc.sections = doc.sections.map((s) =>
      s.type === 'skills'
        ? { ...s, enabled: true, items: [{ id: 'i1', name: 'TypeScript', level: 4 as const }] }
        : { ...s, enabled: false },
    )
    const { container } = render(<CvDocument document={doc} />)
    expect(screen.getByText('Avansert')).toBeInTheDocument()
    expect(container.querySelectorAll('.cv-bar')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test components/cv/__tests__/cv-document.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/cv/CvDocument"`.

- [ ] **Step 3: Write the personalia header**

Create `components/cv/PersonaliaHeader.tsx`:

```tsx
import type { Personalia } from '@/lib/schema/cv'

export function PersonaliaHeader({ personalia }: { personalia: Personalia }) {
  const fullName = [personalia.firstName, personalia.lastName].filter(Boolean).join(' ')
  const place = [personalia.city, personalia.country].filter(Boolean).join(', ')
  const contact = [personalia.email, personalia.phone, place].filter(Boolean).join(' · ')
  const showPhoto = personalia.showPhoto && Boolean(personalia.photo?.dataUrl)

  return (
    <header className="cv-header">
      <div className="cv-header__body">
        {fullName ? <h1 className="cv-header__name">{fullName}</h1> : null}
        {personalia.title ? <p className="cv-header__title">{personalia.title}</p> : null}
        {contact ? <p className="cv-header__contact">{contact}</p> : null}
        {personalia.links.length > 0 ? (
          <p className="cv-links">
            {personalia.links.map((link) => (
              <a className="cv-links__item" key={link.id} href={link.url}>
                {link.label || link.url}
              </a>
            ))}
          </p>
        ) : null}
      </div>
      {showPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element -- the print iframe
           cannot use next/image; the source is always an inline data URL. */
        <img className="cv-header__photo" src={personalia.photo!.dataUrl} alt="" />
      ) : null}
    </header>
  )
}
```

- [ ] **Step 4: Write the single-column shell**

Create `components/cv/shells/SingleColumn.tsx`:

```tsx
import type { ReactNode } from 'react'

export function SingleColumn({ header, sections }: { header: ReactNode; sections: ReactNode }) {
  return (
    <>
      {header}
      {sections}
    </>
  )
}
```

- [ ] **Step 5: Write the oslo template**

Create `components/cv/templates/oslo.ts`:

```ts
import type { Template } from '@/components/cv/types'

/**
 * Oslo — the strict ATS template. Near-black ink, accent used only on rules and
 * headings, and skill levels rendered as words: a proficiency bar means nothing
 * to a résumé parser.
 */
export const oslo: Template = {
  id: 'oslo',
  name: 'Oslo',
  shell: 'single',
  defaultAccent: '#1f2933',
  swatches: ['#1f2933', '#2563eb', '#0f766e', '#b45309', '#7c2d12', '#4c1d95'],
  levelDisplay: 'text',
  tokens: {
    rule: '#c9ced6',
  },
}
```

- [ ] **Step 6: Write the template registry**

Create `components/cv/templates/index.ts`:

```ts
import type { Template } from '@/components/cv/types'
import { oslo } from './oslo'

export const DEFAULT_TEMPLATE_ID = 'oslo'

/** Every template the app can render. Plan 3 adds the remaining eight. */
export const TEMPLATES: Template[] = [oslo]

export function getTemplate(id: string): Template {
  return (
    TEMPLATES.find((template) => template.id === id) ??
    TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID)!
  )
}
```

- [ ] **Step 7: Write the document assembly**

Create `components/cv/CvDocument.tsx`:

```tsx
import { Fragment } from 'react'
import { getCvLabels } from '@/lib/cv-labels'
import { DEFAULT_MARGIN_MM, PAPER } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { buildThemeTokens, themeTokensToStyle, type CvThemeStyle } from '@/lib/theme/tokens'
import { renderSection } from './sections'
import { SingleColumn } from './shells/SingleColumn'
import { getTemplate } from './templates'
import type { RenderContext, ShellId } from './types'
import { PersonaliaHeader } from './PersonaliaHeader'

export const CV_DOC_CLASS = 'cv-doc'

const SHELLS: Record<ShellId, typeof SingleColumn> = {
  single: SingleColumn,
  // Plan 2 adds the sidebar and header-band shells; until then every template
  // falls back to the single column so the app never renders a blank page.
  'sidebar-left': SingleColumn,
  'sidebar-right': SingleColumn,
  'header-band': SingleColumn,
}

export function CvDocument({
  document,
  className,
}: {
  document: CvDocumentData
  className?: string
}) {
  const template = getTemplate(document.theme.templateId)
  const tokens = buildThemeTokens(document.theme, template.tokens)
  const paper = PAPER[document.paper]

  const style: CvThemeStyle = {
    ...themeTokensToStyle(tokens),
    '--cv-page-width': `${paper.widthMm}mm`,
    '--cv-page-height': `${paper.heightMm}mm`,
    '--cv-margin': `${DEFAULT_MARGIN_MM}mm`,
  }

  const context: RenderContext = {
    labels: getCvLabels(document.language),
    levelDisplay: template.levelDisplay,
  }

  const Shell = SHELLS[template.shell]

  const sections = document.sections
    .filter((section) => section.enabled)
    .map((section) => (
      <Fragment key={section.id}>
        {renderSection(section, context, template.overrides)}
      </Fragment>
    ))

  return (
    <div
      className={className ? `${CV_DOC_CLASS} ${className}` : CV_DOC_CLASS}
      style={style}
      lang={document.language}
    >
      <Shell header={<PersonaliaHeader personalia={document.personalia} />} sections={sections} />
    </div>
  )
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `bun run test components/cv`
Expected: PASS — the 21 section tests plus 17 document tests.

- [ ] **Step 9: Verify types and lint**

Run: `bun run typecheck && bun run lint`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add components/cv
git commit -m "feat(cv): assemble CV document with theme tokens and the oslo template"
```

---

### Task 14: Print pipeline

**Files:**
- Create: `lib/print/build-print-html.ts`
- Create: `lib/print/print-cv.ts`
- Test: `lib/print/__tests__/build-print-html.test.ts`
- Test: `lib/print/__tests__/print-cv.test.ts`

**Interfaces:**
- Consumes: `PAPER` from `@/lib/print/paper`; `CV_STYLESHEETS` from `@/lib/print/stylesheets`; `PaperId`, `CvDocument` from `@/lib/schema/cv`
- Produces:
  - `buildPrintTitle(firstName: string, lastName: string): string`
  - `buildPrintHtml(options: BuildPrintHtmlOptions): string`
  - `printCvNode(options: PrintCvNodeOptions): Promise<void>`
  - `type PrintDeps` — injectable seams so the DOM wrapper is testable

**The core idea:** the printed document is the **cloned `outerHTML` of the live preview node**, dropped into an iframe that links the same `public/cv/*.css` files the preview uses. There is no second renderer, so preview and print cannot drift apart in layout — only in how a given browser paints identical CSS.

- [ ] **Step 1: Write the failing test for the pure builder**

Create `lib/print/__tests__/build-print-html.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildPrintHtml, buildPrintTitle } from '@/lib/print/build-print-html'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'

const base = {
  bodyHtml: '<div class="cv-doc">hei</div>',
  title: 'Ola_Nordmann_CV',
  paper: 'a4' as const,
  lang: 'no',
}

describe('buildPrintTitle', () => {
  it('joins the name and appends CV', () => {
    expect(buildPrintTitle('Ola', 'Nordmann')).toBe('Ola_Nordmann_CV')
  })

  it('transliterates Norwegian letters so every filesystem is happy', () => {
    expect(buildPrintTitle('Bjørn', 'Ærlig Åsen')).toBe('Bjorn_AErlig_Asen_CV')
  })

  it('strips characters that are unsafe in a filename', () => {
    expect(buildPrintTitle('Ola/..', 'Nordmann?')).toBe('Ola_Nordmann_CV')
  })

  it('falls back to CV when there is no name', () => {
    expect(buildPrintTitle('', '   ')).toBe('CV')
  })
})

describe('buildPrintHtml', () => {
  it('produces a complete document', () => {
    const html = buildPrintHtml(base)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('</html>')
  })

  it('sets the document language', () => {
    expect(buildPrintHtml({ ...base, lang: 'en' })).toContain('<html lang="en">')
  })

  it('sets an A4 page with no margin', () => {
    expect(buildPrintHtml(base)).toContain('@page { size: A4; margin: 0; }')
  })

  it('sets a Letter page for Letter documents', () => {
    expect(buildPrintHtml({ ...base, paper: 'letter' }))
      .toContain('@page { size: Letter; margin: 0; }')
  })

  it('links the shared CV stylesheets in order', () => {
    const html = buildPrintHtml(base)
    const positions = CV_STYLESHEETS.map((href) => html.indexOf(`href="${href}"`))
    expect(positions.every((position) => position > -1)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('embeds the body markup verbatim', () => {
    expect(buildPrintHtml(base)).toContain('<div class="cv-doc">hei</div>')
  })

  it('escapes the title so a name cannot inject markup', () => {
    const html = buildPrintHtml({ ...base, title: 'a<script>b' })
    expect(html).toContain('<title>a&lt;script&gt;b</title>')
    expect(html).not.toContain('<title>a<script>')
  })

  it('accepts extra stylesheets after the shared ones', () => {
    const html = buildPrintHtml({ ...base, extraStylesheets: ['/cv/templates/oslo.css'] })
    expect(html.indexOf('/cv/templates/oslo.css')).toBeGreaterThan(html.indexOf('/cv/base.css'))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/print/__tests__/build-print-html.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/print/build-print-html"`.

- [ ] **Step 3: Write the pure builder**

Create `lib/print/build-print-html.ts`:

```ts
import type { PaperId } from '@/lib/schema/cv'
import { PAPER } from './paper'
import { CV_STYLESHEETS } from './stylesheets'

const TRANSLITERATIONS: Record<string, string> = {
  æ: 'ae', Æ: 'AE', ø: 'o', Ø: 'O', å: 'a', Å: 'A',
}

/**
 * Builds the filename the browser suggests in the print dialog.
 * Norwegian letters are transliterated so the name survives every filesystem.
 */
export function buildPrintTitle(firstName: string, lastName: string): string {
  const raw = `${firstName} ${lastName}`
    .replace(/[æØøÅåÆ]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return raw ? `${raw}_CV` : 'CV'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type BuildPrintHtmlOptions = {
  /** outerHTML of the rendered `.cv-doc` node. */
  bodyHtml: string
  title: string
  paper: PaperId
  lang: string
  /** Template-specific stylesheets, loaded after the shared ones. */
  extraStylesheets?: readonly string[]
}

export function buildPrintHtml({
  bodyHtml,
  title,
  paper,
  lang,
  extraStylesheets = [],
}: BuildPrintHtmlOptions): string {
  const stylesheets = [...CV_STYLESHEETS, ...extraStylesheets]
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join('\n    ')

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    ${stylesheets}
    <style>
      @page { size: ${PAPER[paper].cssSize}; margin: 0; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`
}
```

- [ ] **Step 4: Write the failing test for the DOM wrapper**

Create `lib/print/__tests__/print-cv.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { printCvNode } from '@/lib/print/print-cv'

function makeNode(): HTMLElement {
  const node = document.createElement('div')
  node.className = 'cv-doc'
  node.textContent = 'hei'
  return node
}

function stubDeps() {
  return {
    waitForLoad: vi.fn(async () => {}),
    waitForFonts: vi.fn(async () => {}),
    invokePrint: vi.fn(),
    cleanupDelayMs: 0,
  }
}

describe('printCvNode', () => {
  it('appends an iframe carrying the cloned markup', async () => {
    const deps = stubDeps()
    let capturedSrcdoc = ''
    deps.waitForLoad = vi.fn(async (iframe: HTMLIFrameElement) => {
      capturedSrcdoc = iframe.srcdoc
    })

    await printCvNode({ node: makeNode(), title: 'Ola_CV', paper: 'a4', lang: 'no' }, deps)

    expect(capturedSrcdoc).toContain('class="cv-doc"')
    expect(capturedSrcdoc).toContain('@page { size: A4; margin: 0; }')
    expect(capturedSrcdoc).toContain('<title>Ola_CV</title>')
  })

  it('waits for load and fonts before printing', async () => {
    const deps = stubDeps()
    await printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps)

    expect(deps.waitForLoad).toHaveBeenCalledTimes(1)
    expect(deps.waitForFonts).toHaveBeenCalledTimes(1)
    expect(deps.invokePrint).toHaveBeenCalledTimes(1)
    expect(deps.waitForFonts.mock.invocationCallOrder[0]!)
      .toBeLessThan(deps.invokePrint.mock.invocationCallOrder[0]!)
  })

  it('removes the iframe once printing is done', async () => {
    const deps = stubDeps()
    await printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })

  it('removes the iframe even when printing throws', async () => {
    const deps = stubDeps()
    deps.invokePrint = vi.fn(() => {
      throw new Error('user cancelled')
    })

    await expect(
      printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps),
    ).rejects.toThrow('user cancelled')

    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })

  it('hides the iframe so it never flashes on screen', async () => {
    const deps = stubDeps()
    let captured: HTMLIFrameElement | undefined
    deps.waitForLoad = vi.fn(async (iframe: HTMLIFrameElement) => {
      captured = iframe
    })

    await printCvNode({ node: makeNode(), title: 'x', paper: 'a4', lang: 'no' }, deps)

    expect(captured?.style.position).toBe('fixed')
    expect(captured?.style.width).toBe('0px')
    expect(captured?.getAttribute('aria-hidden')).toBe('true')
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `bun run test lib/print/__tests__/print-cv.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/print/print-cv"`.

- [ ] **Step 6: Write the DOM wrapper**

Create `lib/print/print-cv.ts`:

```ts
import type { PaperId } from '@/lib/schema/cv'
import { buildPrintHtml } from './build-print-html'

export type PrintCvNodeOptions = {
  /** The live `.cv-doc` element. Its outerHTML is what gets printed. */
  node: HTMLElement
  title: string
  paper: PaperId
  lang: string
  extraStylesheets?: readonly string[]
}

/** Seams so the wrapper can be tested without a real print dialog. */
export type PrintDeps = {
  waitForLoad?: (iframe: HTMLIFrameElement) => Promise<void>
  waitForFonts?: (iframe: HTMLIFrameElement) => Promise<void>
  invokePrint?: (iframe: HTMLIFrameElement) => void
  cleanupDelayMs?: number
}

function defaultWaitForLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (iframe.contentDocument?.readyState === 'complete') {
      resolve()
      return
    }
    iframe.addEventListener('load', () => resolve(), { once: true })
  })
}

async function defaultWaitForFonts(iframe: HTMLIFrameElement): Promise<void> {
  const fonts = iframe.contentDocument?.fonts
  if (!fonts) return
  try {
    await fonts.ready
  } catch {
    // A font that fails to load must not block the export. The PDF will
    // fall back to the next family in the stack.
  }
}

function defaultInvokePrint(iframe: HTMLIFrameElement): void {
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
}

/**
 * Prints the given CV node by cloning it into an isolated iframe that links the
 * same stylesheets as the preview. Isolation is the point: the app's Tailwind
 * reset, dark mode and layout chrome cannot reach the exported PDF.
 */
export async function printCvNode(
  { node, title, paper, lang, extraStylesheets }: PrintCvNodeOptions,
  deps: PrintDeps = {},
): Promise<void> {
  const waitForLoad = deps.waitForLoad ?? defaultWaitForLoad
  const waitForFonts = deps.waitForFonts ?? defaultWaitForFonts
  const invokePrint = deps.invokePrint ?? defaultInvokePrint
  const cleanupDelayMs = deps.cleanupDelayMs ?? 1000

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('tabindex', '-1')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0px'
  iframe.style.height = '0px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'

  iframe.srcdoc = buildPrintHtml({
    bodyHtml: node.outerHTML,
    title,
    paper,
    lang,
    extraStylesheets,
  })

  document.body.appendChild(iframe)

  const remove = () => {
    setTimeout(() => iframe.remove(), cleanupDelayMs)
  }

  try {
    await waitForLoad(iframe)
    await waitForFonts(iframe)
    invokePrint(iframe)
  } catch (error) {
    remove()
    throw error
  }

  remove()
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun run test lib/print`
Expected: PASS — all print tests.

- [ ] **Step 8: Commit**

```bash
git add lib/print
git commit -m "feat(print): export the CV by cloning the preview into an isolated iframe"
```

---

### Task 15: Locale routing with next-intl

**Files:**
- Create: `i18n/routing.ts`
- Create: `i18n/navigation.ts`
- Create: `i18n/request.ts`
- Create: `middleware.ts`
- Create: `messages/no.json`
- Create: `messages/en.json`
- Modify: `next.config.ts`
- Create: `app/[locale]/layout.tsx`
- Delete: `app/page.tsx` (replaced by `app/[locale]/page.tsx` in Task 16)
- Modify: `app/layout.tsx`
- Test: `i18n/__tests__/messages.test.ts`

**Interfaces:**
- Consumes: `CV_STYLESHEETS` from `@/lib/print/stylesheets`
- Produces:
  - `routing` — `{ locales: ['no', 'en'], defaultLocale: 'no' }`
  - `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` from `@/i18n/navigation`
  - `app/[locale]/layout.tsx` — loads the CV stylesheets and wraps children in `NextIntlClientProvider`
- Note: these are the **UI** translations. They are deliberately separate from `lib/cv-labels`, which localizes the CV itself. A user can run the app in Norwegian while writing an English CV.

- [ ] **Step 1: Write the failing test**

Create `i18n/__tests__/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import en from '@/messages/en.json'
import no from '@/messages/no.json'
import { routing } from '@/i18n/routing'

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, nested]) =>
    flatten(nested, prefix ? `${prefix}.${key}` : key),
  )
}

describe('routing', () => {
  it('supports Norwegian and English', () => {
    expect(routing.locales).toEqual(['no', 'en'])
  })

  it('defaults to Norwegian', () => {
    expect(routing.defaultLocale).toBe('no')
  })
})

describe('UI messages', () => {
  it('define the same keys in both languages', () => {
    expect(flatten(no).sort()).toEqual(flatten(en).sort())
  })

  it('have no empty strings', () => {
    for (const messages of [no, en]) {
      const walk = (value: unknown, path: string): void => {
        if (typeof value === 'string') {
          expect(value.trim(), `${path} is empty`).not.toBe('')
          return
        }
        if (value && typeof value === 'object') {
          for (const [key, nested] of Object.entries(value)) walk(nested, `${path}.${key}`)
        }
      }
      walk(messages, 'root')
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test i18n`
Expected: FAIL — `Failed to resolve import "@/i18n/routing"`.

- [ ] **Step 3: Write the routing configuration**

Create `i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['no', 'en'],
  defaultLocale: 'no',
})

export type AppLocale = (typeof routing.locales)[number]
```

Create `i18n/navigation.ts`:

```ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

Create `i18n/request.ts`:

```ts
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 4: Write the message catalogues**

Create `messages/no.json`:

```json
{
  "app": {
    "name": "CVApp",
    "tagline": "Lag en CV du er stolt av"
  },
  "nav": {
    "myCvs": "Mine CV-er",
    "templates": "Maler"
  },
  "dashboard": {
    "title": "Mine CV-er",
    "empty": "Du har ingen CV-er ennå.",
    "create": "Ny CV",
    "untitled": "CV uten navn",
    "open": "Åpne",
    "duplicate": "Dupliser",
    "delete": "Slett",
    "copySuffix": "kopi"
  },
  "editor": {
    "notFound": "Vi finner ikke denne CV-en.",
    "backToList": "Tilbake til mine CV-er",
    "preview": "Forhåndsvis",
    "export": "Last ned PDF",
    "exportHintTitle": "Slik lagrer du som PDF",
    "exportHintMobile": "Velg «Skriv ut» og deretter «Lagre som PDF» i dialogen som åpnes.",
    "undo": "Angre",
    "redo": "Gjør om",
    "pageCount": "{count, plural, one {# side} other {# sider}}"
  },
  "personalia": {
    "title": "Personalia",
    "firstName": "Fornavn",
    "lastName": "Etternavn",
    "professionalTitle": "Tittel",
    "email": "E-post",
    "phone": "Telefon",
    "city": "Sted",
    "country": "Land"
  },
  "experience": {
    "title": "Arbeidserfaring",
    "add": "Legg til stilling",
    "remove": "Fjern",
    "role": "Rolle",
    "organisation": "Arbeidsgiver",
    "location": "Sted",
    "from": "Fra",
    "to": "Til",
    "current": "Jobber her nå",
    "description": "Beskrivelse",
    "descriptionHint": "Én linje per punkt. Anbefalt, men valgfritt.",
    "modeBullets": "Punkter",
    "modeProse": "Løpende tekst"
  }
}
```

Create `messages/en.json`:

```json
{
  "app": {
    "name": "CVApp",
    "tagline": "Build a CV you're proud of"
  },
  "nav": {
    "myCvs": "My CVs",
    "templates": "Templates"
  },
  "dashboard": {
    "title": "My CVs",
    "empty": "You haven't created a CV yet.",
    "create": "New CV",
    "untitled": "Untitled CV",
    "open": "Open",
    "duplicate": "Duplicate",
    "delete": "Delete",
    "copySuffix": "copy"
  },
  "editor": {
    "notFound": "We can't find that CV.",
    "backToList": "Back to my CVs",
    "preview": "Preview",
    "export": "Download PDF",
    "exportHintTitle": "How to save as PDF",
    "exportHintMobile": "Choose Print, then Save as PDF in the dialog that opens.",
    "undo": "Undo",
    "redo": "Redo",
    "pageCount": "{count, plural, one {# page} other {# pages}}"
  },
  "personalia": {
    "title": "Personal details",
    "firstName": "First name",
    "lastName": "Last name",
    "professionalTitle": "Job title",
    "email": "Email",
    "phone": "Phone",
    "city": "City",
    "country": "Country"
  },
  "experience": {
    "title": "Work Experience",
    "add": "Add position",
    "remove": "Remove",
    "role": "Role",
    "organisation": "Employer",
    "location": "Location",
    "from": "From",
    "to": "To",
    "current": "I work here now",
    "description": "Description",
    "descriptionHint": "One line per bullet. Recommended, but optional.",
    "modeBullets": "Bullets",
    "modeProse": "Prose"
  }
}
```

- [ ] **Step 5: Wire the plugin into Next**

Replace `next.config.ts` with:

```ts
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
```

Create `middleware.ts` at the repo root:

```ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
```

- [ ] **Step 6: Restructure the layouts**

Replace `app/layout.tsx` with a pass-through, because the `<html>` element now needs the locale and therefore belongs to the locale layout:

```tsx
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
```

Delete the scaffolded home page, which Task 16 replaces:

```bash
rm app/page.tsx
```

Create `app/[locale]/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { routing } from '@/i18n/routing'
import { CV_STYLESHEETS } from '@/lib/print/stylesheets'
import '../globals.css'

export const metadata: Metadata = {
  title: 'CVApp',
  description: 'Free CV builder. No account, no watermark, no paywall.',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* The CV stylesheets are plain CSS in public/ so the print iframe can
            load the exact same files. See lib/print/stylesheets.ts. */}
        {CV_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun run test i18n`
Expected: PASS — 4 tests.

- [ ] **Step 8: Verify the app still builds**

Run: `bun run build`
Expected: build succeeds. A 404 for `/` is expected at this point; Task 16 adds `app/[locale]/page.tsx`.

- [ ] **Step 9: Commit**

```bash
git add i18n messages middleware.ts next.config.ts app
git commit -m "feat(i18n): add next-intl locale routing for Norwegian and English"
```

---

### Task 16: Editor vertical slice

**Files:**
- Create: `lib/hooks/use-hydrated.ts`
- Create: `components/editor/PersonaliaForm.tsx`
- Create: `components/editor/PreviewPane.tsx`
- Create: `components/editor/ExportButton.tsx`
- Create: `components/editor/EditorSplit.tsx`
- Create: `app/[locale]/page.tsx`
- Create: `app/[locale]/cv/page.tsx`
- Create: `app/[locale]/cv/[id]/page.tsx`
- Test: `lib/hooks/__tests__/use-hydrated.test.tsx`
- Test: `components/editor/__tests__/editor.test.tsx`

**Interfaces:**
- Consumes: `useDocuments`, `selectOrderedDocuments` from `@/lib/store/documents`; `CvDocument` component from `@/components/cv/CvDocument`; `printCvNode`, `buildPrintTitle` from `@/lib/print`; `PAPER`, `mmToPx` from `@/lib/print/paper`; `Link` from `@/i18n/navigation`
- Produces:
  - `useHydrated(): boolean`
  - `PersonaliaForm({ personalia, onChange })` — `onChange(patch: Partial<Personalia>)`
  - `PreviewPane({ document, containerRef })` — renders the live page, scaled to fit
  - `ExportButton({ getNode, document, print? })`
  - `EditorSplit({ document, onPersonaliaChange })`
  - Routes `/[locale]`, `/[locale]/cv`, `/[locale]/cv/[id]`
- Design note: every editor component is **presentational** and takes its data and callbacks as props. Only the route components touch the store. This keeps the component tests free of store setup and keeps Plan 2's forms easy to add.

- [ ] **Step 1: Write the failing hydration test**

Create `lib/hooks/__tests__/use-hydrated.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useHydrated } from '@/lib/hooks/use-hydrated'

function Probe() {
  return <span>{useHydrated() ? 'hydrated' : 'pending'}</span>
}

describe('useHydrated', () => {
  it('reports hydrated after the effect has run', () => {
    render(<Probe />)
    expect(screen.getByText('hydrated')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test lib/hooks`
Expected: FAIL — `Failed to resolve import "@/lib/hooks/use-hydrated"`.

- [ ] **Step 3: Write the hydration hook**

Create `lib/hooks/use-hydrated.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

/**
 * False during the server render and the first client render, true afterwards.
 * CV data lives in localStorage, which the server cannot see, so any component
 * reading it must render a placeholder until this returns true or React will
 * report a hydration mismatch.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
```

- [ ] **Step 4: Write the failing editor test**

Create `components/editor/__tests__/editor.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { EditorSplit } from '@/components/editor/EditorSplit'
import { ExportButton } from '@/components/editor/ExportButton'
import { PersonaliaForm } from '@/components/editor/PersonaliaForm'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(): CvDocumentData {
  let counter = 0
  return createEmptyDocument(
    {},
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )
}

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('PersonaliaForm', () => {
  it('renders the current values', () => {
    const doc = fixture()
    wrap(
      <PersonaliaForm
        personalia={{ ...doc.personalia, firstName: 'Ola' }}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Fornavn')).toHaveValue('Ola')
  })

  it('reports each edit as a patch', async () => {
    const onChange = vi.fn()
    const doc = fixture()
    wrap(<PersonaliaForm personalia={doc.personalia} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Fornavn'), 'O')
    expect(onChange).toHaveBeenCalledWith({ firstName: 'O' })
  })

  it('reports the professional title separately from the CV name', async () => {
    const onChange = vi.fn()
    wrap(<PersonaliaForm personalia={fixture().personalia} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Tittel'), 'U')
    expect(onChange).toHaveBeenCalledWith({ title: 'U' })
  })
})

describe('EditorSplit', () => {
  it('shows the form and a live preview of the same document', () => {
    const doc = fixture()
    doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }
    const { container } = wrap(<EditorSplit document={doc} onPersonaliaChange={vi.fn()} />)

    expect(screen.getByLabelText('Fornavn')).toHaveValue('Ola')
    expect(container.querySelector('.cv-doc')).toHaveTextContent('Ola Nordmann')
  })

  it('renders exactly one CV document node for the export path to clone', () => {
    const { container } = wrap(<EditorSplit document={fixture()} onPersonaliaChange={vi.fn()} />)
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(1)
  })
})

describe('ExportButton', () => {
  it('prints the node it is given, with a name-derived title', async () => {
    const print = vi.fn(async () => {})
    const doc = fixture()
    doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }

    const node = window.document.createElement('div')
    node.className = 'cv-doc'

    wrap(<ExportButton document={doc} getNode={() => node} print={print} />)
    await userEvent.click(screen.getByRole('button', { name: 'Last ned PDF' }))

    expect(print).toHaveBeenCalledTimes(1)
    expect(print.mock.calls[0]![0]).toMatchObject({
      node,
      title: 'Ola_Nordmann_CV',
      paper: 'a4',
      lang: 'no',
    })
  })

  it('does nothing when there is no node to print', async () => {
    const print = vi.fn(async () => {})
    wrap(<ExportButton document={fixture()} getNode={() => null} print={print} />)
    await userEvent.click(screen.getByRole('button', { name: 'Last ned PDF' }))
    expect(print).not.toHaveBeenCalled()
  })

  it('uses the CV language, not the UI language, for the printed document', async () => {
    const print = vi.fn(async () => {})
    const doc = { ...fixture(), language: 'en' as const }
    const node = window.document.createElement('div')

    wrap(<ExportButton document={doc} getNode={() => node} print={print} />)
    await userEvent.click(screen.getByRole('button', { name: 'Last ned PDF' }))

    expect(print.mock.calls[0]![0]).toMatchObject({ lang: 'en' })
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `bun run test components/editor`
Expected: FAIL — `Failed to resolve import "@/components/editor/PersonaliaForm"`.

- [ ] **Step 6: Write the personalia form**

Create `components/editor/PersonaliaForm.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import type { Personalia } from '@/lib/schema/cv'

type TextField = 'firstName' | 'lastName' | 'title' | 'email' | 'phone' | 'city' | 'country'

const FIELDS: { name: TextField; labelKey: string; type?: string }[] = [
  { name: 'firstName', labelKey: 'firstName' },
  { name: 'lastName', labelKey: 'lastName' },
  { name: 'title', labelKey: 'professionalTitle' },
  { name: 'email', labelKey: 'email', type: 'email' },
  { name: 'phone', labelKey: 'phone', type: 'tel' },
  { name: 'city', labelKey: 'city' },
  { name: 'country', labelKey: 'country' },
]

export function PersonaliaForm({
  personalia,
  onChange,
}: {
  personalia: Personalia
  onChange: (patch: Partial<Personalia>) => void
}) {
  const t = useTranslations('personalia')

  return (
    <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {t('title')}
      </legend>
      {FIELDS.map((field) => (
        <label className="flex flex-col gap-1.5 text-sm" key={field.name}>
          <span className="font-medium text-neutral-700">{t(field.labelKey)}</span>
          <input
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10"
            type={field.type ?? 'text'}
            value={personalia[field.name]}
            onChange={(event) => onChange({ [field.name]: event.target.value })}
          />
        </label>
      ))}
    </fieldset>
  )
}
```

- [ ] **Step 7: Write the preview pane**

Create `components/editor/PreviewPane.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { CvDocument } from '@/components/cv/CvDocument'
import { PAPER, mmToPx } from '@/lib/print/paper'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

/**
 * Renders the CV at its true paper width and scales it down to fit the pane.
 * The scale lives on this wrapper, never on the `.cv-doc` node itself, so the
 * markup the print pipeline clones is unscaled.
 */
export function PreviewPane({
  document,
  containerRef,
}: {
  document: CvDocumentData
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  const pageWidthPx = mmToPx(PAPER[document.paper].widthMm)
  const pageHeightPx = mmToPx(PAPER[document.paper].heightMm)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      const available = frame.clientWidth
      if (available > 0) setScale(Math.min(1, available / pageWidthPx))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [pageWidthPx])

  return (
    <div className="w-full overflow-auto" ref={frameRef}>
      <div style={{ height: pageHeightPx * scale, width: pageWidthPx * scale }}>
        <div
          className="origin-top-left shadow-[0_10px_40px_-12px_rgb(0_0_0/0.25)]"
          style={{ transform: `scale(${scale})`, width: pageWidthPx }}
          ref={containerRef}
        >
          <CvDocument document={document} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Write the export button**

Create `components/editor/ExportButton.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { buildPrintTitle } from '@/lib/print/build-print-html'
import { printCvNode } from '@/lib/print/print-cv'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'

export function ExportButton({
  document,
  getNode,
  print = printCvNode,
}: {
  document: CvDocumentData
  getNode: () => HTMLElement | null
  print?: typeof printCvNode
}) {
  const t = useTranslations('editor')
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    const node = getNode()
    if (!node) return

    setBusy(true)
    try {
      await print({
        node,
        title: buildPrintTitle(document.personalia.firstName, document.personalia.lastName),
        paper: document.paper,
        lang: document.language,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
      disabled={busy}
      onClick={handleClick}
      type="button"
    >
      {t('export')}
    </button>
  )
}
```

- [ ] **Step 9: Write the split editor**

Create `components/editor/EditorSplit.tsx`:

```tsx
'use client'

import { useRef } from 'react'
import type { CvDocument as CvDocumentData, Personalia } from '@/lib/schema/cv'
import { ExportButton } from './ExportButton'
import { PersonaliaForm } from './PersonaliaForm'
import { PreviewPane } from './PreviewPane'

export function EditorSplit({
  document,
  onPersonaliaChange,
}: {
  document: CvDocumentData
  onPersonaliaChange: (patch: Partial<Personalia>) => void
}) {
  const previewRef = useRef<HTMLDivElement | null>(null)

  const getNode = () =>
    previewRef.current?.querySelector<HTMLElement>('.cv-doc') ?? null

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <ExportButton document={document} getNode={getNode} />
        </div>
        <PersonaliaForm personalia={document.personalia} onChange={onPersonaliaChange} />
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <PreviewPane document={document} containerRef={previewRef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `bun run test components/editor lib/hooks`
Expected: PASS — 9 tests.

- [ ] **Step 11: Write the routes**

Create `app/[locale]/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="text-5xl font-black tracking-tight text-balance sm:text-6xl">
        {t('app.tagline')}
      </h1>
      <p className="text-lg text-neutral-600">{t('app.name')}</p>
      <div>
        <Link
          className="inline-flex rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white"
          href="/cv"
        >
          {t('nav.myCvs')}
        </Link>
      </div>
    </main>
  )
}
```

Create `app/[locale]/cv/page.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { selectOrderedDocuments, useDocuments } from '@/lib/store/documents'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const hydrated = useHydrated()
  const documents = useDocuments(selectOrderedDocuments)
  const createDocument = useDocuments((state) => state.createDocument)

  function handleCreate() {
    router.push(`/cv/${createDocument({})}`)
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <button
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
          onClick={handleCreate}
          type="button"
        >
          {t('create')}
        </button>
      </div>

      {!hydrated ? null : documents.length === 0 ? (
        <p className="text-neutral-600">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.id}>
              <Link
                className="block rounded-2xl border border-neutral-200 px-5 py-4 transition hover:border-neutral-400"
                href={`/cv/${document.id}`}
              >
                {document.name || t('untitled')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

Create `app/[locale]/cv/[id]/page.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { use } from 'react'
import { EditorSplit } from '@/components/editor/EditorSplit'
import { Link } from '@/i18n/navigation'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import type { Personalia } from '@/lib/schema/cv'
import { useDocuments } from '@/lib/store/documents'

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('editor')
  const hydrated = useHydrated()
  const document = useDocuments((state) => state.documents[id])
  const updateDocument = useDocuments((state) => state.updateDocument)

  function handlePersonaliaChange(patch: Partial<Personalia>) {
    updateDocument(id, (draft) => {
      Object.assign(draft.personalia, patch)
    })
  }

  if (!hydrated) return null

  if (!document) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-neutral-600">{t('notFound')}</p>
        <Link className="underline" href="/cv">
          {t('backToList')}
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <EditorSplit document={document} onPersonaliaChange={handlePersonaliaChange} />
    </main>
  )
}
```

- [ ] **Step 12: Verify the whole suite, types and build**

Run: `bun run test && bun run typecheck && bun run build`
Expected: all pass.

- [ ] **Step 13: Verify the export path by hand**

Run: `bun run dev`, open `http://localhost:3000/no/cv`, create a CV, type a name, and press "Last ned PDF".

Expected: the browser print dialog opens showing a single A4 page with the name rendered in Inter, and "Save as PDF" produces a file whose text can be selected and copied. **Selectable text is the assertion that matters** — it is what makes the PDF ATS-parseable.

- [ ] **Step 14: Commit**

```bash
git add app components/editor lib/hooks
git commit -m "feat(editor): add split editor with live preview and PDF export"
```

---

### Task 17: Work experience form

**Files:**
- Create: `components/editor/ExperienceForm.tsx`
- Modify: `components/editor/EditorSplit.tsx`
- Modify: `app/[locale]/cv/[id]/page.tsx`
- Test: `components/editor/__tests__/experience-form.test.tsx`

**Interfaces:**
- Consumes: `TimelineEntry` from `@/lib/schema/cv`
- Produces:
  - `ExperienceForm({ entries, onAddEntry, onUpdateEntry, onRemoveEntry })`
  - `EditorSplit` gains props `experienceEntries`, `onAddEntry`, `onUpdateEntry`, `onRemoveEntry`
- Design note: the description is a plain `<textarea>` with a per-entry bullets/prose toggle, matching the schema's `descriptionMode`. There is no rich-text editor, deliberately — one line per bullet is what `Description` renders and what a résumé parser reads cleanly.

- [ ] **Step 1: Write the failing test**

Create `components/editor/__tests__/experience-form.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { ExperienceForm } from '@/components/editor/ExperienceForm'
import type { TimelineEntry } from '@/lib/schema/cv'
import messages from '@/messages/no.json'

const entry: TimelineEntry = {
  id: 'e1',
  role: 'Utvikler',
  organisation: 'Acme AS',
  location: 'Oslo',
  from: '2022-01',
  to: '',
  current: true,
  description: 'Ledet team',
  descriptionMode: 'bullets',
}

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function handlers() {
  return {
    onAddEntry: vi.fn(),
    onUpdateEntry: vi.fn(),
    onRemoveEntry: vi.fn(),
  }
}

describe('ExperienceForm', () => {
  it('renders one card per entry', () => {
    wrap(<ExperienceForm entries={[entry, { ...entry, id: 'e2' }]} {...handlers()} />)
    expect(screen.getAllByRole('group')).toHaveLength(2)
  })

  it('shows the current values', () => {
    wrap(<ExperienceForm entries={[entry]} {...handlers()} />)
    expect(screen.getByLabelText('Rolle')).toHaveValue('Utvikler')
    expect(screen.getByLabelText('Arbeidsgiver')).toHaveValue('Acme AS')
  })

  it('reports a role edit as a patch for that entry', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[entry]} {...props} />)

    await userEvent.type(screen.getByLabelText('Rolle'), 'X')
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e1', { role: 'UtviklerX' })
  })

  it('adds an entry', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[]} {...props} />)

    await userEvent.click(screen.getByRole('button', { name: 'Legg til stilling' }))
    expect(props.onAddEntry).toHaveBeenCalledTimes(1)
  })

  it('removes the entry it belongs to', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[entry]} {...props} />)

    await userEvent.click(screen.getByRole('button', { name: 'Fjern' }))
    expect(props.onRemoveEntry).toHaveBeenCalledWith('e1')
  })

  it('disables the end date while the role is current', () => {
    wrap(<ExperienceForm entries={[entry]} {...handlers()} />)
    expect(screen.getByLabelText('Til')).toBeDisabled()
  })

  it('clears the end date when the role becomes current', async () => {
    const props = handlers()
    wrap(
      <ExperienceForm
        entries={[{ ...entry, current: false, to: '2024-06' }]}
        {...props}
      />,
    )

    await userEvent.click(screen.getByLabelText('Jobber her nå'))
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e1', { current: true, to: '' })
  })

  it('switches the description between bullets and prose', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[entry]} {...props} />)

    await userEvent.click(screen.getByLabelText('Løpende tekst'))
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e1', { descriptionMode: 'prose' })
  })

  it('explains that the description is one line per bullet', () => {
    wrap(<ExperienceForm entries={[entry]} {...handlers()} />)
    expect(
      screen.getByText('Én linje per punkt. Anbefalt, men valgfritt.'),
    ).toBeInTheDocument()
  })

  it('scopes fields to their own entry', async () => {
    const props = handlers()
    wrap(
      <ExperienceForm
        entries={[entry, { ...entry, id: 'e2', role: 'Designer' }]}
        {...props}
      />,
    )

    const second = screen.getAllByRole('group')[1]!
    await userEvent.type(within(second).getByLabelText('Rolle'), 'Y')
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e2', { role: 'DesignerY' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test components/editor/__tests__/experience-form.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/editor/ExperienceForm"`.

- [ ] **Step 3: Write the form**

Create `components/editor/ExperienceForm.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import type { TimelineEntry } from '@/lib/schema/cv'

const inputClass =
  'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 disabled:bg-neutral-100 disabled:text-neutral-400'

export function ExperienceForm({
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
}: {
  entries: TimelineEntry[]
  onAddEntry: () => void
  onUpdateEntry: (entryId: string, patch: Partial<TimelineEntry>) => void
  onRemoveEntry: (entryId: string) => void
}) {
  const t = useTranslations('experience')

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {t('title')}
      </h2>

      {entries.map((entry) => (
        <fieldset
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4"
          key={entry.id}
        >
          <legend className="sr-only">{entry.role || t('title')}</legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">{t('role')}</span>
              <input
                className={inputClass}
                onChange={(event) => onUpdateEntry(entry.id, { role: event.target.value })}
                type="text"
                value={entry.role}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">{t('organisation')}</span>
              <input
                className={inputClass}
                onChange={(event) =>
                  onUpdateEntry(entry.id, { organisation: event.target.value })
                }
                type="text"
                value={entry.organisation}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700">{t('location')}</span>
              <input
                className={inputClass}
                onChange={(event) => onUpdateEntry(entry.id, { location: event.target.value })}
                type="text"
                value={entry.location ?? ''}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-neutral-700">{t('from')}</span>
                <input
                  className={inputClass}
                  onChange={(event) => onUpdateEntry(entry.id, { from: event.target.value })}
                  type="month"
                  value={entry.from}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-neutral-700">{t('to')}</span>
                <input
                  className={inputClass}
                  disabled={entry.current}
                  onChange={(event) => onUpdateEntry(entry.id, { to: event.target.value })}
                  type="month"
                  value={entry.to}
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              checked={entry.current}
              onChange={(event) =>
                onUpdateEntry(entry.id, {
                  current: event.target.checked,
                  ...(event.target.checked ? { to: '' } : {}),
                })
              }
              type="checkbox"
            />
            {t('current')}
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-medium text-neutral-700">{t('description')}</span>
              <div className="flex gap-3 text-xs text-neutral-600">
                {(['bullets', 'prose'] as const).map((mode) => (
                  <label className="flex items-center gap-1.5" key={mode}>
                    <input
                      checked={entry.descriptionMode === mode}
                      name={`description-mode-${entry.id}`}
                      onChange={() => onUpdateEntry(entry.id, { descriptionMode: mode })}
                      type="radio"
                    />
                    {mode === 'bullets' ? t('modeBullets') : t('modeProse')}
                  </label>
                ))}
              </div>
            </div>
            <textarea
              className={inputClass}
              onChange={(event) => onUpdateEntry(entry.id, { description: event.target.value })}
              rows={4}
              value={entry.description ?? ''}
            />
            <p className="text-xs text-neutral-500">{t('descriptionHint')}</p>
          </div>

          <div className="flex justify-end">
            <button
              className="text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
              onClick={() => onRemoveEntry(entry.id)}
              type="button"
            >
              {t('remove')}
            </button>
          </div>
        </fieldset>
      ))}

      <div>
        <button
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:border-neutral-900"
          onClick={onAddEntry}
          type="button"
        >
          {t('add')}
        </button>
      </div>
    </section>
  )
}
```

Note on the radio label test: `getByLabelText('Løpende tekst')` resolves because each radio is wrapped by its own `<label>`.

- [ ] **Step 4: Run the form test to verify it passes**

Run: `bun run test components/editor/__tests__/experience-form.test.tsx`
Expected: PASS — 10 tests.

- [ ] **Step 5: Wire the form into the split editor**

Edit `components/editor/EditorSplit.tsx`. Add the import:

```tsx
import { ExperienceForm } from './ExperienceForm'
```

Extend the props type with:

```tsx
  experienceEntries: TimelineEntry[]
  onAddEntry: () => void
  onUpdateEntry: (entryId: string, patch: Partial<TimelineEntry>) => void
  onRemoveEntry: (entryId: string) => void
```

(and add `TimelineEntry` to the existing type import from `@/lib/schema/cv`), then render it directly below `<PersonaliaForm .../>`:

```tsx
        <ExperienceForm
          entries={experienceEntries}
          onAddEntry={onAddEntry}
          onRemoveEntry={onRemoveEntry}
          onUpdateEntry={onUpdateEntry}
        />
```

- [ ] **Step 6: Update the existing EditorSplit tests**

In `components/editor/__tests__/editor.test.tsx`, both `EditorSplit` renders now need the new props. Add this helper above the `describe('EditorSplit')` block:

```tsx
const splitHandlers = {
  onPersonaliaChange: vi.fn(),
  experienceEntries: [],
  onAddEntry: vi.fn(),
  onUpdateEntry: vi.fn(),
  onRemoveEntry: vi.fn(),
}
```

and replace both `<EditorSplit document={...} onPersonaliaChange={vi.fn()} />` usages with
`<EditorSplit document={...} {...splitHandlers} />`.

- [ ] **Step 7: Wire the store in the editor route**

Edit `app/[locale]/cv/[id]/page.tsx`. Add `TimelineEntry` to the type import from `@/lib/schema/cv`, then add these handlers below `handlePersonaliaChange`:

```tsx
  const experienceSection = document?.sections.find((section) => section.type === 'experience')
  const experienceEntries =
    experienceSection && 'entries' in experienceSection ? experienceSection.entries : []

  function withExperience(recipe: (entries: TimelineEntry[]) => void) {
    updateDocument(id, (draft) => {
      const section = draft.sections.find((candidate) => candidate.type === 'experience')
      if (section && 'entries' in section && section.entries) recipe(section.entries)
    })
  }

  function handleAddEntry() {
    withExperience((entries) => {
      entries.push({
        id: crypto.randomUUID(),
        role: '',
        organisation: '',
        from: '',
        to: '',
        current: false,
        description: '',
        descriptionMode: 'bullets',
      })
    })
  }

  function handleUpdateEntry(entryId: string, patch: Partial<TimelineEntry>) {
    withExperience((entries) => {
      const entry = entries.find((candidate) => candidate.id === entryId)
      if (entry) Object.assign(entry, patch)
    })
  }

  function handleRemoveEntry(entryId: string) {
    withExperience((entries) => {
      const index = entries.findIndex((candidate) => candidate.id === entryId)
      if (index >= 0) entries.splice(index, 1)
    })
  }
```

Then pass them to `EditorSplit`:

```tsx
      <EditorSplit
        document={document}
        experienceEntries={experienceEntries}
        onAddEntry={handleAddEntry}
        onPersonaliaChange={handlePersonaliaChange}
        onRemoveEntry={handleRemoveEntry}
        onUpdateEntry={handleUpdateEntry}
      />
```

Note: `experienceSection` is derived before the early returns, so the hook order stays stable — it is a plain expression, not a hook, and `document` may be undefined at that point, hence the optional chaining.

- [ ] **Step 8: Run the whole suite, types and build**

Run: `bun run test && bun run typecheck && bun run build`
Expected: all pass.

- [ ] **Step 9: Verify by hand**

Run `bun run dev`, open a CV, add a position, fill in role, employer and dates, and type three lines into the description.

Expected: three bullets appear in the live preview; switching to "Løpende tekst" turns them into a paragraph; ticking "Jobber her nå" makes the date range read "jan. 2022 – nå"; reloading the page keeps everything.

- [ ] **Step 10: Commit**

```bash
git add components/editor app
git commit -m "feat(editor): add work experience form with bullets and prose modes"
```

---

## What Plan 1 delivers

A running app at `/no` and `/en` where you can create unlimited CVs, edit personalia and work experience, watch an accurate A4 or Letter page update live, and export a real selectable-text PDF — with everything autosaved to localStorage, validated on reload, and undoable.

## Deliberately not in Plan 1

These are Plans 2 and 3, written once this one lands:

- **Plan 2 — Editor and design system:** the remaining section forms, drag-to-reorder for sections and entries, section enable/rename, the design panel (template, accent swatches and picker, font pairing, density, paper), the mobile bottom-sheet preview, photo upload with compression, the dashboard's duplicate/rename/delete, JSON import and export, page-break guides and the page counter, undo/redo UI.
- **Plan 3 — Templates and polish:** the remaining eight templates across the four layout shells, the four shells themselves, the template gallery and template-first onboarding, the landing page, the mobile export hint, the remaining font pairings, and the vibrant playful chrome pass.

---

## Self-review

**Spec coverage.** Plan 1 implements: the dual-language model (Tasks 8 and 15), unlimited CVs with localStorage persistence (Task 5), versioned schema with migrations (Task 4), undo/redo (Tasks 6–7), A4 and Letter geometry (Task 10), theme tokens with WCAG-safe accent ink (Task 9), the shared-renderer template engine (Tasks 12–13), the print-CSS export path (Tasks 11 and 14), the split desktop editor with live preview (Tasks 16–17), the 5-step skill scale and 7-step CEFR language scale rendered as bars with an ATS-strict text fallback (Tasks 8, 12, 13), and per-entry bullets/prose descriptions (Tasks 12 and 17). Spec items with no task here are listed under "Deliberately not in Plan 1" above, each assigned to Plan 2 or Plan 3.

**Deviation from the spec, recorded.** The spec's file map implies CV templates are ordinary React components in the app's styling system. They are not: they use plain CSS from `public/cv/` with self-hosted `@font-face`, because the print iframe is a separate document that cannot see Tailwind's stylesheet or `next/font`'s faces. The spec should be amended when Plan 1 lands.

**Type consistency.** `CvDocument` is a type in `lib/schema/cv.ts` and a component in `components/cv/CvDocument.tsx`; every consumer imports the type as `CvDocument as CvDocumentData`. `FactoryDeps` is defined once in `lib/schema/defaults.ts` and reused by the store. `LevelDisplay` and `RenderContext` are defined in `components/cv/types.ts` and imported everywhere else. `printCvNode` takes `{ node, title, paper, lang }` in Tasks 14 and 16 alike. `SkillLevel` (1–5) and `LanguageLevel` (CEFR) are never interchanged.
