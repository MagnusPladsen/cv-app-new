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
  return render(<>{renderSection(section, ctx)}</>)
}

describe('sectionTitle', () => {
  it('uses the localized label', () => {
    const section: Section = { id: 's', type: 'experience', enabled: true, entries: [] }
    expect(sectionTitle(section, getCvLabels('no'))).toBe('Arbeidserfaring')
    expect(sectionTitle(section, getCvLabels('en'))).toBe('Work Experience')
  })

  it('prefers a per-CV override', () => {
    const section: Section = {
      id: 's',
      type: 'experience',
      enabled: true,
      entries: [],
      titleOverride: 'Relevant erfaring',
    }
    expect(sectionTitle(section, getCvLabels('no'))).toBe('Relevant erfaring')
  })

  it('uses the custom section title', () => {
    const section: Section = {
      id: 's',
      type: 'custom',
      enabled: true,
      title: 'Publikasjoner',
      shape: 'bullets',
      bullets: ['A'],
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
      entries: [
        { ...entry, description: 'Ledet team\nKuttet lastetid', descriptionMode: 'prose' },
      ],
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
      entries: [
        {
          id: 'r1',
          name: 'Kari Nordmann',
          role: 'Teamleder',
          organisation: 'Acme AS',
          email: 'kari@acme.no',
          phone: '+47 900 00 000',
        },
      ],
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
      id: 's',
      type: 'custom',
      enabled: true,
      title: 'Publikasjoner',
      shape: 'bullets',
      bullets: ['En artikkel', 'En til'],
    })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders the text shape', () => {
    draw({
      id: 's',
      type: 'custom',
      enabled: true,
      title: 'Notat',
      shape: 'text',
      text: 'Fritekst her.',
    })
    expect(screen.getByText('Fritekst her.')).toBeInTheDocument()
  })

  it('renders nothing when the chosen shape has no content', () => {
    const { container } = draw({
      id: 's',
      type: 'custom',
      enabled: true,
      title: 'Tom',
      shape: 'bullets',
      bullets: [],
    })
    expect(container).toBeEmptyDOMElement()
  })
})
