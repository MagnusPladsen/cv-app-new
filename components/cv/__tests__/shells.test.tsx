import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CvDocument } from '@/components/cv/CvDocument'
import { HeaderBand } from '@/components/cv/shells/HeaderBand'
import { SidebarLeft } from '@/components/cv/shells/SidebarLeft'
import { SidebarRight } from '@/components/cv/shells/SidebarRight'
import { SingleColumn } from '@/components/cv/shells/SingleColumn'
import { splitSections } from '@/components/cv/split-sections'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createDemoDocument } from '@/lib/schema/demo'

function demo(): CvDocumentData {
  let counter = 0
  return createDemoDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })
}

const parts = {
  header: <div data-testid="header">header</div>,
  sections: <div data-testid="main">main</div>,
  sidebar: <div data-testid="aside">aside</div>,
}

describe('splitSections', () => {
  it('puts everything in main when there is no sidebar', () => {
    const split = splitSections(demo().sections, undefined)
    expect(split.sidebar).toHaveLength(0)
    expect(split.main.length).toBeGreaterThan(0)
  })

  it('moves the named types into the sidebar and out of main', () => {
    const split = splitSections(demo().sections, ['skills', 'languages'])
    expect(split.sidebar.map((s) => s.type)).toEqual(['skills', 'languages'])
    expect(split.main.map((s) => s.type)).not.toContain('skills')
    expect(split.main.map((s) => s.type)).not.toContain('languages')
  })

  it('never places a section in both groups', () => {
    const split = splitSections(demo().sections, ['skills', 'languages', 'interests'])
    const ids = [...split.main, ...split.sidebar].map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('drops disabled sections from both groups', () => {
    const document = demo()
    const disabled = document.sections.map((section) => ({ ...section, enabled: false }))
    const split = splitSections(disabled, ['skills'])
    expect(split.main).toHaveLength(0)
    expect(split.sidebar).toHaveLength(0)
  })

  it('preserves document order within each group', () => {
    const document = demo()
    const split = splitSections(document.sections, ['skills'])
    const order = document.sections.filter((s) => s.enabled).map((s) => s.id)
    const mainOrder = split.main.map((s) => s.id)
    expect(mainOrder).toEqual(order.filter((id) => mainOrder.includes(id)))
  })

  it('ignores a sidebar type the document does not have enabled', () => {
    const split = splitSections(demo().sections, ['drivingLicence'])
    expect(split.sidebar).toHaveLength(0)
  })
})

describe('shells', () => {
  it('SingleColumn renders header then main, with no shell wrapper', () => {
    const { container } = render(<SingleColumn {...parts} />)
    expect(container.querySelector('.cv-shell')).toBeNull()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('main')).toBeInTheDocument()
  })

  it('SidebarLeft puts the aside before the main column', () => {
    const { container } = render(<SidebarLeft {...parts} />)
    const shell = container.querySelector('.cv-shell--sidebar')!
    expect(shell.firstElementChild).toHaveClass('cv-shell__aside')
    expect(shell.lastElementChild).toHaveClass('cv-shell__main')
  })

  it('SidebarRight puts the main column first', () => {
    const { container } = render(<SidebarRight {...parts} />)
    const shell = container.querySelector('.cv-shell--sidebar')!
    expect(shell.firstElementChild).toHaveClass('cv-shell__main')
    expect(shell.lastElementChild).toHaveClass('cv-shell__aside')
  })

  it('HeaderBand wraps the header in the accent band', () => {
    const { container } = render(<HeaderBand {...parts} />)
    const band = container.querySelector('.cv-band')!
    expect(band).toContainElement(screen.getByTestId('header'))
    expect(band).not.toContainElement(screen.getByTestId('main'))
  })
})

describe('CvDocument integration', () => {
  it('renders every section title exactly once', () => {
    const { container } = render(<CvDocument document={demo()} />)
    const titles = [...container.querySelectorAll('.cv-section__title')].map((n) => n.textContent)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('renders the personalia header once', () => {
    const { container } = render(<CvDocument document={demo()} />)
    expect(container.querySelectorAll('.cv-header__name')).toHaveLength(1)
  })

  it('still renders content for an unknown template id', () => {
    const document = demo()
    render(
      <CvDocument document={{ ...document, theme: { ...document.theme, templateId: 'nope' } }} />,
    )
    expect(screen.getByText('Arbeidserfaring')).toBeInTheDocument()
  })
})
