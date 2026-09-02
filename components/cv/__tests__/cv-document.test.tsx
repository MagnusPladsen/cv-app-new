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
      email: 'ola@example.no',
      phone: '+47 900 00 000',
      city: 'Oslo',
      country: 'Norge',
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
    const doc = withPersonalia({
      showPhoto: false,
      photo: { dataUrl: 'data:image/png;base64,AA' },
    })
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-header__photo')).toBeNull()
  })

  it('omits the photo when showPhoto is true but none is set', () => {
    const doc = withPersonalia({ showPhoto: true, photo: undefined })
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-header__photo')).toBeNull()
  })

  it('renders the photo when one is set and shown', () => {
    const doc = withPersonalia({
      showPhoto: true,
      photo: { dataUrl: 'data:image/png;base64,AA' },
    })
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-header__photo')).toHaveAttribute(
      'src',
      'data:image/png;base64,AA',
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

describe('template accents', () => {
  it('gives every template a default accent that is one of its swatches', () => {
    for (const template of TEMPLATES) {
      expect(
        template.swatches.map((s) => s.toLowerCase()),
        `${template.id}'s defaultAccent is not offered as a swatch`,
      ).toContain(template.defaultAccent.toLowerCase())
    }
  })
})

describe('template scoping', () => {
  it('adds a template class so its stylesheet has something to scope to', () => {
    const doc = fixture()
    doc.theme = { ...doc.theme, templateId: 'oslo' }
    const { container } = render(<CvDocument document={doc} />)
    expect(container.querySelector('.cv-doc')).toHaveClass('cv-doc--oslo')
  })

  it('keeps a caller-supplied className alongside it', () => {
    const { container } = render(<CvDocument className="extra" document={fixture()} />)
    const root = container.querySelector('.cv-doc')!
    expect(root).toHaveClass('cv-doc--oslo')
    expect(root).toHaveClass('extra')
  })
})
