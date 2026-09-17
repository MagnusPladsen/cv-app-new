import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { BackupControls } from '@/components/dashboard/BackupControls'
import { CvCard } from '@/components/dashboard/CvCard'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(name = 'Frontend'): CvDocumentData {
  let counter = 0
  return createEmptyDocument({ name }, { newId: () => `id-${++counter}`, now: () => 0 })
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
    onOpen: vi.fn(),
    onDuplicate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onExport: vi.fn(),
  }
}

describe('CvCard', () => {
  it('shows the CV name', () => {
    wrap(<CvCard document={fixture()} {...handlers()} />)
    expect(screen.getByRole('button', { name: 'Frontend' })).toBeInTheDocument()
  })

  it('names an unnamed CV after the person and the day it was made', () => {
    // "CV uten navn" told you nothing, and told you the same nothing about
    // every unnamed CV in the list.
    const doc = fixture('')
    doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }
    doc.createdAt = Date.UTC(2026, 8, 15)

    wrap(<CvCard document={doc} {...handlers()} />)
    expect(screen.getByRole('button', { name: /Ola Nordmann/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /15\.09\.2026/ })).toBeInTheDocument()
  })

  it('falls back to the date alone before there is a name to use', () => {
    const doc = fixture('')
    doc.createdAt = Date.UTC(2026, 8, 15)
    wrap(<CvCard document={doc} {...handlers()} />)
    expect(screen.getByRole('button', { name: /^CV · 15\.09\.2026$/ })).toBeInTheDocument()
  })

  it('opens the CV', async () => {
    const h = handlers()
    const doc = fixture()
    wrap(<CvCard document={doc} {...h} />)
    await userEvent.click(screen.getByRole('button', { name: 'Frontend' }))
    expect(h.onOpen).toHaveBeenCalledWith(doc.id)
  })

  it('duplicates and exports', async () => {
    const h = handlers()
    const doc = fixture()
    wrap(<CvCard document={doc} {...h} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dupliser' }))
    expect(h.onDuplicate).toHaveBeenCalledWith(doc.id)
    await userEvent.click(screen.getByRole('button', { name: 'Last ned sikkerhetskopi' }))
    expect(h.onExport).toHaveBeenCalledWith(doc.id)
  })

  it('renames through an inline field', async () => {
    const h = handlers()
    const doc = fixture()
    wrap(<CvCard document={doc} {...h} />)

    await userEvent.click(screen.getByRole('button', { name: 'Gi nytt navn' }))
    const field = screen.getByLabelText('Nytt navn på CV-en')
    await userEvent.clear(field)
    await userEvent.type(field, 'Backend{Enter}')

    expect(h.onRename).toHaveBeenCalledWith(doc.id, 'Backend')
  })

  it('asks before deleting', async () => {
    const h = handlers()
    wrap(<CvCard document={fixture()} {...h} />)

    await userEvent.click(screen.getByRole('button', { name: 'Slett' }))
    expect(h.onDelete).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        'Slette «Frontend»? CV-en finnes bare i denne nettleseren og kan ikke hentes tilbake.',
      ),
    ).toBeInTheDocument()
  })

  it('deletes once confirmed', async () => {
    const h = handlers()
    const doc = fixture()
    wrap(<CvCard document={doc} {...h} />)

    await userEvent.click(screen.getByRole('button', { name: 'Slett' }))
    await userEvent.click(screen.getByRole('button', { name: 'Slett' }))
    expect(h.onDelete).toHaveBeenCalledWith(doc.id)
  })

  it('can back out of deleting', async () => {
    const h = handlers()
    wrap(<CvCard document={fixture()} {...h} />)

    await userEvent.click(screen.getByRole('button', { name: 'Slett' }))
    await userEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(h.onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Dupliser' })).toBeInTheDocument()
  })
})

describe('BackupControls', () => {
  it('passes the file contents to the importer', async () => {
    const onImportText = vi.fn(() => ({ ok: true }))
    wrap(<BackupControls onImportText={onImportText} />)

    const file = new File(['{"a":1}'], 'cv.json', { type: 'application/json' })
    await userEvent.upload(screen.getByLabelText('Importer fra fil'), file)

    expect(onImportText).toHaveBeenCalledWith('{"a":1}')
  })

  it('shows an error when the file is not a CV', async () => {
    const onImportText = vi.fn(() => ({ ok: false }))
    wrap(<BackupControls onImportText={onImportText} />)

    const file = new File(['nope'], 'cv.json', { type: 'application/json' })
    await userEvent.upload(screen.getByLabelText('Importer fra fil'), file)

    expect(await screen.findByText('Filen kunne ikke leses som en CV.')).toBeInTheDocument()
  })
})
