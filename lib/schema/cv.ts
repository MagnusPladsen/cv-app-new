import { z } from 'zod'

export const CURRENT_SCHEMA_VERSION = 1

export const cvLanguageSchema = z.enum(['no', 'en'])
export type CvLanguage = z.infer<typeof cvLanguageSchema>

export const paperSchema = z.enum(['a4', 'letter'])
export type PaperId = z.infer<typeof paperSchema>

export const densitySchema = z.enum(['compact', 'normal', 'roomy'])
export type Density = z.infer<typeof densitySchema>

export const skillLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
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
  'experience',
  'education',
  'projects',
  'volunteering',
  'courses',
] as const
export type TimelineSectionType = (typeof TIMELINE_SECTION_TYPES)[number]

export const sectionSchema = z.discriminatedUnion('type', [
  z.object({ ...sectionBase, type: z.literal('summary'), text: z.string() }),
  z.object({
    ...sectionBase,
    type: z.literal('experience'),
    entries: z.array(timelineEntrySchema),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('education'),
    entries: z.array(timelineEntrySchema),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('projects'),
    entries: z.array(timelineEntrySchema),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('volunteering'),
    entries: z.array(timelineEntrySchema),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('courses'),
    entries: z.array(timelineEntrySchema),
  }),
  z.object({ ...sectionBase, type: z.literal('skills'), items: z.array(skillItemSchema) }),
  z.object({ ...sectionBase, type: z.literal('languages'), items: z.array(languageItemSchema) }),
  z.object({
    ...sectionBase,
    type: z.literal('certifications'),
    entries: z.array(certEntrySchema),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('references'),
    entries: z.array(referenceEntrySchema),
  }),
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
