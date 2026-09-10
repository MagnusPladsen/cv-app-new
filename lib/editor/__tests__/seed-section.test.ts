import { describe, expect, it, vi } from 'vitest'

import { seedSection } from '@/lib/editor/seed-section'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import { createEmptySection } from '@/lib/schema/defaults'
import type { Section, SectionType } from '@/lib/schema/cv'

function handlers() {
  return {
    onAddEntry: vi.fn(),
    onAddItem: vi.fn(),
    onAddCert: vi.fn(),
    onAddReference: vi.fn(),
  } as unknown as DocumentEditorHandlers & {
    onAddEntry: ReturnType<typeof vi.fn>
    onAddItem: ReturnType<typeof vi.fn>
    onAddCert: ReturnType<typeof vi.fn>
    onAddReference: ReturnType<typeof vi.fn>
  }
}

let counter = 0
const section = (type: SectionType): Section =>
  createEmptySection(type, { newId: () => `id-${(counter += 1)}`, now: () => 0 })

describe('seedSection', () => {
  it.each(['experience', 'education', 'projects', 'volunteering', 'courses'] as const)(
    'gives an empty %s section a row to type into',
    (type) => {
      // Om meg hands you a textarea straight away. Everything else handed you
      // a lone "Legg til" button and no fields, so the section looked as if it
      // had nowhere to write.
      const h = handlers()
      expect(seedSection(section(type), h)).toBe(true)
      expect(h.onAddEntry).toHaveBeenCalledOnce()
    },
  )

  it.each(['skills', 'languages'] as const)('gives an empty %s section a row', (type) => {
    const h = handlers()
    expect(seedSection(section(type), h)).toBe(true)
    expect(h.onAddItem).toHaveBeenCalledOnce()
  })

  it('seeds certifications and references with their own kind of row', () => {
    const certs = handlers()
    seedSection(section('certifications'), certs)
    expect(certs.onAddCert).toHaveBeenCalledOnce()

    const refs = handlers()
    seedSection(section('references'), refs)
    expect(refs.onAddReference).toHaveBeenCalledOnce()
  })

  it('leaves a section that already has content alone', () => {
    // Otherwise every visit to a filled section would add a blank row.
    const filled = section('experience')
    if ('entries' in filled) {
      filled.entries = [
        {
          id: 'entry-1',
          role: 'Sykepleier',
          organisation: 'Sykehuset',
          from: '2020-01',
          to: '',
          current: true,
          descriptionMode: 'bullets',
        },
      ]
    }

    const h = handlers()
    expect(seedSection(filled, h)).toBe(false)
    expect(h.onAddEntry).not.toHaveBeenCalled()
  })

  it.each(['summary', 'interests', 'drivingLicence'] as const)(
    'adds nothing to %s, which already shows a field',
    (type) => {
      const h = handlers()
      expect(seedSection(section(type), h)).toBe(false)
      expect(h.onAddEntry).not.toHaveBeenCalled()
      expect(h.onAddItem).not.toHaveBeenCalled()
    },
  )
})
