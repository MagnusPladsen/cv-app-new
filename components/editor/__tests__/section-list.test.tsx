import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SectionList } from '@/components/editor/SectionList'
import { getCvLabels } from '@/lib/cv-labels'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

let counter = 0
const makeDocument = () =>
  createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function props(overrides: Record<string, unknown> = {}) {
  const doc = makeDocument()
  return {
    sections: doc.sections,
    labels: getCvLabels('no'),
    activeSectionId: doc.sections[0]!.id,
    onSelect: vi.fn(),
    onToggle: vi.fn(),
    onMove: vi.fn(),
    onAddCustom: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  }
}

describe('SectionList', () => {
  it('lists every section with its localized title', () => {
    wrap(<SectionList {...props()} />)
    expect(screen.getByText('Arbeidserfaring')).toBeInTheDocument()
    expect(screen.getByText('Førerkort')).toBeInTheDocument()
  })

  it('shows a title override in place of the label', () => {
    const p = props()
    p.sections = p.sections.map((section) =>
      section.type === 'experience'
        ? { ...section, titleOverride: 'Relevant erfaring' }
        : section,
    )
    wrap(<SectionList {...p} />)
    expect(screen.getByText('Relevant erfaring')).toBeInTheDocument()
    expect(screen.queryByText('Arbeidserfaring')).not.toBeInTheDocument()
  })

  it('reports a selection', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    await userEvent.click(screen.getByText('Utdanning'))
    const educationId = p.sections.find((s) => s.type === 'education')!.id
    expect(p.onSelect).toHaveBeenCalledWith(educationId)
  })

  it('toggles a section on', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const row = screen.getByText('Sertifiseringer').closest('li')!
    await userEvent.click(within(row).getByRole('checkbox'))
    const id = p.sections.find((s) => s.type === 'certifications')!.id
    expect(p.onToggle).toHaveBeenCalledWith(id, true)
  })

  it('moves a section down by keyboard', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const row = screen.getByText('Om meg').closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Flytt ned' }))
    expect(p.onMove).toHaveBeenCalledWith(0, 1)
  })

  it('moves a section up by keyboard', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const row = screen.getByText('Arbeidserfaring').closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Flytt opp' }))
    expect(p.onMove).toHaveBeenCalledWith(1, 0)
  })

  it('disables move up on the first row and move down on the last', () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const first = screen.getByText('Om meg').closest('li')!
    const last = screen.getByText('Referanser').closest('li')!
    expect(within(first).getByRole('button', { name: 'Flytt opp' })).toBeDisabled()
    expect(within(last).getByRole('button', { name: 'Flytt ned' })).toBeDisabled()
  })

  it('adds a custom section', async () => {
    const p = props()
    wrap(<SectionList {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til egen seksjon' }))
    expect(p.onAddCustom).toHaveBeenCalledTimes(1)
  })

  it('offers remove only on custom sections', async () => {
    const p = props()
    const custom = {
      id: 'custom-1',
      type: 'custom' as const,
      enabled: true,
      title: 'Publikasjoner',
      shape: 'bullets' as const,
      bullets: [],
    }
    p.sections = [...p.sections, custom]
    wrap(<SectionList {...p} />)

    const builtIn = screen.getByText('Arbeidserfaring').closest('li')!
    expect(within(builtIn).queryByRole('button', { name: 'Fjern' })).toBeNull()

    const customRow = screen.getByText('Publikasjoner').closest('li')!
    await userEvent.click(within(customRow).getByRole('button', { name: 'Fjern' }))
    expect(p.onRemove).toHaveBeenCalledWith('custom-1')
  })

  it('marks the active section', () => {
    const p = props()
    wrap(<SectionList {...p} />)
    const active = screen.getByText('Om meg').closest('li')!
    expect(within(active).getByRole('button', { name: 'Om meg' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })
})
