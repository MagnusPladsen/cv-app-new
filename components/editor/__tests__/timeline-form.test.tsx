import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TimelineForm } from '@/components/editor/forms/TimelineForm'
import type { TimelineEntry } from '@/lib/schema/cv'
import messages from '@/messages/no.json'

const entry: TimelineEntry = {
  id: 'e1',
  role: 'Utvikler',
  organisation: 'Acme AS',
  location: 'Oslo',
  from: '2022-01',
  to: '',
  current: true,
  description: 'Ledet team',
  descriptionMode: 'bullets',
}

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
    title: 'Arbeidserfaring',
    entries: [entry],
    onAddEntry: vi.fn(),
    onUpdateEntry: vi.fn(),
    onRemoveEntry: vi.fn(),
    onMoveEntry: vi.fn(),
    ...overrides,
  }
}

describe('TimelineForm', () => {
  it('renders the title it is given rather than a hardcoded one', () => {
    wrap(<TimelineForm {...props({ title: 'Utdanning' })} />)
    expect(screen.getByText('Utdanning')).toBeInTheDocument()
  })

  it('renders one card per entry', () => {
    wrap(<TimelineForm {...props({ entries: [entry, { ...entry, id: 'e2' }] })} />)
    expect(screen.getAllByRole('group')).toHaveLength(2)
  })

  it('shows the current values', () => {
    wrap(<TimelineForm {...props()} />)
    expect(screen.getByLabelText('Rolle')).toHaveValue('Utvikler')
    expect(screen.getByLabelText('Arbeidsgiver')).toHaveValue('Acme AS')
  })

  it('reports a role edit as a patch for that entry', async () => {
    const p = props()
    wrap(<TimelineForm {...p} />)
    await userEvent.type(screen.getByLabelText('Rolle'), 'X')
    expect(p.onUpdateEntry).toHaveBeenCalledWith('s', 'e1', { role: 'UtviklerX' })
  })

  it('adds an entry for its own section', async () => {
    const p = props({ entries: [] })
    wrap(<TimelineForm {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til stilling' }))
    expect(p.onAddEntry).toHaveBeenCalledWith('s')
  })

  it('removes the entry it belongs to', async () => {
    const p = props()
    wrap(<TimelineForm {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fjern' }))
    expect(p.onRemoveEntry).toHaveBeenCalledWith('s', 'e1')
  })

  it('disables the end date while the role is current', () => {
    wrap(<TimelineForm {...props()} />)
    expect(screen.getByLabelText('Til')).toBeDisabled()
  })

  it('clears the end date when the role becomes current', async () => {
    const p = props({ entries: [{ ...entry, current: false, to: '2024-06' }] })
    wrap(<TimelineForm {...p} />)
    await userEvent.click(screen.getByLabelText('Jobber her nå'))
    expect(p.onUpdateEntry).toHaveBeenCalledWith('s', 'e1', { current: true, to: '' })
  })

  it('switches the description between bullets and prose', async () => {
    const p = props()
    wrap(<TimelineForm {...p} />)
    await userEvent.click(screen.getByLabelText('Løpende tekst'))
    expect(p.onUpdateEntry).toHaveBeenCalledWith('s', 'e1', { descriptionMode: 'prose' })
  })

  it('explains that the description is one line per bullet', () => {
    wrap(<TimelineForm {...props()} />)
    expect(screen.getByText('Én linje per punkt. Anbefalt, men valgfritt.')).toBeInTheDocument()
  })

  it('scopes fields to their own entry', async () => {
    const p = props({ entries: [entry, { ...entry, id: 'e2', role: 'Designer' }] })
    wrap(<TimelineForm {...p} />)
    const second = screen.getAllByRole('group')[1]!
    await userEvent.type(within(second).getByLabelText('Rolle'), 'Y')
    expect(p.onUpdateEntry).toHaveBeenCalledWith('s', 'e2', { role: 'DesignerY' })
  })

  it('moves an entry down', async () => {
    const p = props({ entries: [entry, { ...entry, id: 'e2' }] })
    wrap(<TimelineForm {...p} />)
    const first = screen.getAllByRole('group')[0]!
    await userEvent.click(within(first).getByRole('button', { name: 'Flytt ned' }))
    expect(p.onMoveEntry).toHaveBeenCalledWith('s', 0, 1)
  })

  it('disables move up on the first entry and move down on the last', () => {
    const p = props({ entries: [entry, { ...entry, id: 'e2' }] })
    wrap(<TimelineForm {...p} />)
    const [first, last] = screen.getAllByRole('group')
    expect(within(first!).getByRole('button', { name: 'Flytt opp' })).toBeDisabled()
    expect(within(last!).getByRole('button', { name: 'Flytt ned' })).toBeDisabled()
  })
})
