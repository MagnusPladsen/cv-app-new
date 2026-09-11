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
    onRename: vi.fn(),
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
    // The name is now "Rediger: Om meg" - the row opens that section's form,
    // and saying so is the whole point of the change. It still contains the
    // visible label, which is what label-in-name requires.
    expect(within(active).getByRole('button', { name: 'Rediger: Om meg' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })
})

describe('switching a section on', () => {
  it('opens it, because that is what a person expects next', async () => {
    // Ticking a section says "I want this on my CV", and the next thing
    // wanted is somewhere to write. Without this a section could be enabled,
    // sitting in the list, and still appear to have no form anywhere - which
    // is exactly how the sections came to look unfillable.
    const onSelect = vi.fn()
    const onToggle = vi.fn()
    wrap(<SectionList {...props({ onSelect, onToggle })} />)

    const off = screen.getAllByRole('checkbox').find((box) => !(box as HTMLInputElement).checked)!
    await userEvent.click(off)

    expect(onToggle).toHaveBeenCalledWith(expect.any(String), true)
    expect(onSelect).toHaveBeenCalledWith(expect.any(String))
  })

  it('does not open a section being switched off', async () => {
    // Hiding a section is not a request to edit it.
    const onSelect = vi.fn()
    const onToggle = vi.fn()
    wrap(<SectionList {...props({ onSelect, onToggle })} />)

    const on = screen.getAllByRole('checkbox').find((box) => (box as HTMLInputElement).checked)!
    await userEvent.click(on)

    expect(onToggle).toHaveBeenCalledWith(expect.any(String), false)
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('renaming from the list', () => {
  it('turns the row into a field, so the heading is edited where the section is chosen', async () => {
    const onRename = vi.fn()
    wrap(<SectionList {...props({ onRename })} />)

    await userEvent.click(screen.getAllByRole('button', { name: /^Gi nytt navn:/ })[0]!)

    const field = screen.getByRole('textbox')
    await userEvent.type(field, 'X')
    expect(onRename).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('X'))
  })

  it('finishes on Enter', async () => {
    wrap(<SectionList {...props()} />)
    await userEvent.click(screen.getAllByRole('button', { name: /^Gi nytt navn:/ })[0]!)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('keeps what was typed when Escape closes the field', async () => {
    // The heading is stored as you type, so reverting on Escape would undo an
    // edit the CV has already shown.
    const onRename = vi.fn()
    wrap(<SectionList {...props({ onRename })} />)
    await userEvent.click(screen.getAllByRole('button', { name: /^Gi nytt navn:/ })[0]!)

    await userEvent.type(screen.getByRole('textbox'), 'Y')
    await userEvent.keyboard('{Escape}')

    expect(onRename).toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('spaces while renaming', () => {
  it('keeps a trailing space, so a heading can grow a second word', async () => {
    // The displayed title is trimmed. Binding the field to it erased every
    // space the moment it was typed, so no rename could reach two words.
    const onRename = vi.fn()
    wrap(<SectionList {...props({ onRename })} />)
    await userEvent.click(screen.getAllByRole('button', { name: /^Gi nytt navn:/ })[0]!)

    const field = screen.getByRole('textbox') as HTMLInputElement
    await userEvent.clear(field)
    await userEvent.type(field, 'Kort om')

    expect(field.value).toBe('Kort om')
    expect(onRename).toHaveBeenLastCalledWith(expect.any(String), 'Kort om')
  })
})
