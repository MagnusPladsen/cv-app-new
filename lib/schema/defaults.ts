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
  fontPairId?: string
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
      fontPairId: input.fontPairId ?? 'inter',
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
