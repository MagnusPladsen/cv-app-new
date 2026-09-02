import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ExperienceForm } from '@/components/editor/ExperienceForm'
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

function handlers() {
  return {
    onAddEntry: vi.fn(),
    onUpdateEntry: vi.fn(),
    onRemoveEntry: vi.fn(),
  }
}

describe('ExperienceForm', () => {
  it('renders one card per entry', () => {
    wrap(<ExperienceForm entries={[entry, { ...entry, id: 'e2' }]} {...handlers()} />)
    expect(screen.getAllByRole('group')).toHaveLength(2)
  })

  it('shows the current values', () => {
    wrap(<ExperienceForm entries={[entry]} {...handlers()} />)
    expect(screen.getByLabelText('Rolle')).toHaveValue('Utvikler')
    expect(screen.getByLabelText('Arbeidsgiver')).toHaveValue('Acme AS')
  })

  it('reports a role edit as a patch for that entry', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[entry]} {...props} />)

    await userEvent.type(screen.getByLabelText('Rolle'), 'X')
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e1', { role: 'UtviklerX' })
  })

  it('adds an entry', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[]} {...props} />)

    await userEvent.click(screen.getByRole('button', { name: 'Legg til stilling' }))
    expect(props.onAddEntry).toHaveBeenCalledTimes(1)
  })

  it('removes the entry it belongs to', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[entry]} {...props} />)

    await userEvent.click(screen.getByRole('button', { name: 'Fjern' }))
    expect(props.onRemoveEntry).toHaveBeenCalledWith('e1')
  })

  it('disables the end date while the role is current', () => {
    wrap(<ExperienceForm entries={[entry]} {...handlers()} />)
    expect(screen.getByLabelText('Til')).toBeDisabled()
  })

  it('clears the end date when the role becomes current', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[{ ...entry, current: false, to: '2024-06' }]} {...props} />)

    await userEvent.click(screen.getByLabelText('Jobber her nå'))
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e1', { current: true, to: '' })
  })

  it('switches the description between bullets and prose', async () => {
    const props = handlers()
    wrap(<ExperienceForm entries={[entry]} {...props} />)

    await userEvent.click(screen.getByLabelText('Løpende tekst'))
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e1', { descriptionMode: 'prose' })
  })

  it('explains that the description is one line per bullet', () => {
    wrap(<ExperienceForm entries={[entry]} {...handlers()} />)
    expect(screen.getByText('Én linje per punkt. Anbefalt, men valgfritt.')).toBeInTheDocument()
  })

  it('scopes fields to their own entry', async () => {
    const props = handlers()
    wrap(
      <ExperienceForm entries={[entry, { ...entry, id: 'e2', role: 'Designer' }]} {...props} />,
    )

    const second = screen.getAllByRole('group')[1]!
    await userEvent.type(within(second).getByLabelText('Rolle'), 'Y')
    expect(props.onUpdateEntry).toHaveBeenCalledWith('e2', { role: 'DesignerY' })
  })
})
