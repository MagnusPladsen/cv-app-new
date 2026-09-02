import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LeveledItemsForm } from '@/components/editor/forms/LeveledItemsForm'
import { getCvLabels } from '@/lib/cv-labels'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    sectionId: 's',
    title: 'Ferdigheter',
    kind: 'skills' as const,
    items: [{ id: 'i1', name: 'TypeScript', level: 4 as const }],
    labels: getCvLabels('no'),
    onAddItem: vi.fn(),
    onUpdateItem: vi.fn(),
    onRemoveItem: vi.fn(),
    ...overrides,
  }
}

describe('LeveledItemsForm', () => {
  it('renders one row per item', () => {
    wrap(<LeveledItemsForm {...props()} />)
    expect(screen.getByDisplayValue('TypeScript')).toBeInTheDocument()
  })

  it('offers the five skill levels using the CV wording', () => {
    wrap(<LeveledItemsForm {...props()} />)
    const select = screen.getByLabelText('Nivå')
    expect(within(select).getByRole('option', { name: 'Avansert' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Ekspert' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Ingen' })).toBeInTheDocument()
  })

  it('offers the CEFR scale for languages', () => {
    wrap(
      <LeveledItemsForm
        {...props({
          kind: 'languages',
          title: 'Språk',
          items: [{ id: 'i1', name: 'Norsk', level: 'native' }],
        })}
      />,
    )
    const select = screen.getByLabelText('Nivå')
    expect(within(select).getByRole('option', { name: 'Morsmål' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'C1' })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: 'Avansert' })).toBeNull()
  })

  it('reports a name edit', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.type(screen.getByLabelText('Navn'), 'X')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { name: 'TypeScriptX' })
  })

  it('reports a numeric level for skills', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Nivå'), 'Ekspert')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { level: 5 })
  })

  it('reports a CEFR level for languages', async () => {
    const p = props({
      kind: 'languages',
      items: [{ id: 'i1', name: 'Norsk', level: 'b1' }],
    })
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Nivå'), 'C1')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { level: 'c1' })
  })

  it('clears the level when None is chosen', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Nivå'), 'Ingen')
    expect(p.onUpdateItem).toHaveBeenCalledWith('s', 'i1', { level: undefined })
  })

  it('adds and removes items', async () => {
    const p = props()
    wrap(<LeveledItemsForm {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til' }))
    expect(p.onAddItem).toHaveBeenCalledWith('s')
    await userEvent.click(screen.getByRole('button', { name: 'Fjern' }))
    expect(p.onRemoveItem).toHaveBeenCalledWith('s', 'i1')
  })

  it('shows the blank option selected for an item with no level', () => {
    wrap(<LeveledItemsForm {...props({ items: [{ id: 'i1', name: 'Rust' }] })} />)
    expect(screen.getByLabelText('Nivå')).toHaveValue('')
  })
})
