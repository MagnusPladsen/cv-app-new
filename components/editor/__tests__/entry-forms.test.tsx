import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CertificationsForm } from '@/components/editor/forms/CertificationsForm'
import { ReferencesForm } from '@/components/editor/forms/ReferencesForm'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const handlers = () => ({
  onAddEntry: vi.fn(),
  onUpdateEntry: vi.fn(),
  onRemoveEntry: vi.fn(),
})

describe('CertificationsForm', () => {
  const entry = { id: 'c1', name: 'AWS SAA', issuer: 'Amazon', date: '2023-05' }

  it('shows the current values', () => {
    wrap(
      <CertificationsForm
        sectionId="s"
        title="Sertifiseringer"
        entries={[entry]}
        {...handlers()}
      />,
    )
    expect(screen.getByLabelText('Navn')).toHaveValue('AWS SAA')
    expect(screen.getByLabelText('Utsteder')).toHaveValue('Amazon')
    expect(screen.getByLabelText('Dato')).toHaveValue('2023-05')
  })

  it('reports an edit for the right entry', async () => {
    const h = handlers()
    wrap(<CertificationsForm sectionId="s" title="Sertifiseringer" entries={[entry]} {...h} />)
    await userEvent.type(screen.getByLabelText('Utsteder'), 'X')
    expect(h.onUpdateEntry).toHaveBeenCalledWith('s', 'c1', { issuer: 'AmazonX' })
  })

  it('adds and removes', async () => {
    const h = handlers()
    wrap(<CertificationsForm sectionId="s" title="Sertifiseringer" entries={[entry]} {...h} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til' }))
    expect(h.onAddEntry).toHaveBeenCalledWith('s')
    await userEvent.click(screen.getByRole('button', { name: 'Fjern' }))
    expect(h.onRemoveEntry).toHaveBeenCalledWith('s', 'c1')
  })

  it('uses a month input so the date matches the CV formatter contract', () => {
    wrap(<CertificationsForm sectionId="s" title="Sertifiseringer" entries={[entry]} {...handlers()} />)
    expect(screen.getByLabelText('Dato')).toHaveAttribute('type', 'month')
  })
})

describe('ReferencesForm', () => {
  const entry = {
    id: 'r1',
    name: 'Kari Nordmann',
    role: 'Teamleder',
    organisation: 'Acme AS',
    email: 'kari@acme.no',
    phone: '+47 900 00 000',
  }

  it('explains what an empty list prints on the CV', () => {
    wrap(<ReferencesForm sectionId="s" title="Referanser" entries={[]} {...handlers()} />)
    expect(
      screen.getByText(
        'Uten referanser her skriver CV-en «Referanser oppgis ved forespørsel».',
      ),
    ).toBeInTheDocument()
  })

  it('reports an edit for the right entry', async () => {
    const h = handlers()
    wrap(<ReferencesForm sectionId="s" title="Referanser" entries={[entry]} {...h} />)
    await userEvent.type(screen.getByLabelText('E-post'), 'X')
    expect(h.onUpdateEntry).toHaveBeenCalledWith('s', 'r1', { email: 'kari@acme.noX' })
  })

  it('adds a referee', async () => {
    const h = handlers()
    wrap(<ReferencesForm sectionId="s" title="Referanser" entries={[]} {...h} />)
    await userEvent.click(screen.getByRole('button', { name: 'Legg til' }))
    expect(h.onAddEntry).toHaveBeenCalledWith('s')
  })
})
