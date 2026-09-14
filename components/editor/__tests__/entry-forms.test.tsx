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
    // The month control is a button, and its accessible name carries both the
    // field label and the chosen month - a screen reader user has no other
    // way to hear what is currently selected.
    expect(screen.getByRole('button', { name: /Dato.*mai 2023/i })).toBeInTheDocument()
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

  it('still stores YYYY-MM, which every template formatter expects', async () => {
    // The native <input type="month"> is gone - Firefox never implemented it
    // and showed a bare text box - but the stored shape has to be unchanged,
    // or every date on every CV renders wrong.
    const props = handlers()
    wrap(
      <CertificationsForm sectionId="s" title="Sertifiseringer" entries={[entry]} {...props} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Dato/i }))
    await userEvent.click(screen.getByRole('button', { name: 'aug' }))

    expect(props.onUpdateEntry).toHaveBeenCalledWith('s', 'c1', { date: '2023-08' })
  })

  it('opens on the year already chosen, not on this one', async () => {
    wrap(<CertificationsForm sectionId="s" title="Sertifiseringer" entries={[entry]} {...handlers()} />)
    await userEvent.click(screen.getByRole('button', { name: /Dato/i }))
    expect(screen.getByText('2023')).toBeInTheDocument()
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
