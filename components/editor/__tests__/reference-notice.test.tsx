import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { ReferencesForm } from '@/components/editor/forms/ReferencesForm'
import messages from '@/messages/no.json'

function renderForm() {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <ReferencesForm
        entries={[
          {
            id: 'entry-1',
            name: 'Kari Solberg',
            role: 'Utviklingssjef',
            organisation: 'Nordvest Digital',
            email: 'kari@example.no',
            phone: '+47 900 11 223',
          },
        ]}
        onAddEntry={vi.fn()}
        onRemoveEntry={vi.fn()}
        onUpdateEntry={vi.fn()}
        sectionId="section-1"
        title="Referanser"
      />
    </NextIntlClientProvider>,
  )
}

describe('the references form', () => {
  it('tells the user they need the referee permission', () => {
    // A referee is a person who never visited CVApp and consented to nothing.
    // This notice at the point of entry, plus never contacting them, is the
    // position the GDPR spec calls the minimum defensible one.
    renderForm()
    expect(screen.getByText(messages.reference.consentNotice)).toBeInTheDocument()
  })

  it('keeps the notice separate from the formatting hint', () => {
    // Merging them would bury an obligation inside a layout tip.
    renderForm()
    const notice = screen.getByText(messages.reference.consentNotice)
    const hint = screen.getByText(messages.reference.onRequestHint)
    expect(notice).not.toBe(hint)
  })

  it('says CVApp never contacts the referee, which is what keeps Art. 14 proportionate', () => {
    renderForm()
    expect(screen.getByText(/kontakter dem aldri/)).toBeInTheDocument()
  })
})
