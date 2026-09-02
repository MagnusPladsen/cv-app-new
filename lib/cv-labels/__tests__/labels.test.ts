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
