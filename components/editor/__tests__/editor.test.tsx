import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { EditorSplit } from '@/components/editor/EditorSplit'
import { ExportButton } from '@/components/editor/ExportButton'
import { PersonaliaForm } from '@/components/editor/PersonaliaForm'
import type { PrintCvNodeOptions } from '@/lib/print/print-cv'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(): CvDocumentData {
  let counter = 0
  return createEmptyDocument(
    {},
    { newId: () => `id-${++counter}`, now: () => 1_700_000_000_000 },
  )
}

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('PersonaliaForm', () => {
  it('renders the current values', () => {
    const doc = fixture()
    wrap(
      <PersonaliaForm personalia={{ ...doc.personalia, firstName: 'Ola' }} onChange={vi.fn()} />,
    )
    expect(screen.getByLabelText('Fornavn')).toHaveValue('Ola')
  })

  it('reports each edit as a patch', async () => {
    const onChange = vi.fn()
    const doc = fixture()
    wrap(<PersonaliaForm personalia={doc.personalia} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Fornavn'), 'O')
    expect(onChange).toHaveBeenCalledWith({ firstName: 'O' })
  })

  it('reports the professional title separately from the CV name', async () => {
    const onChange = vi.fn()
    wrap(<PersonaliaForm personalia={fixture().personalia} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Tittel'), 'U')
    expect(onChange).toHaveBeenCalledWith({ title: 'U' })
  })
})

describe('EditorSplit', () => {
  it('shows the form and a live preview of the same document', () => {
    const doc = fixture()
    doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }
    const { container } = wrap(<EditorSplit document={doc} onPersonaliaChange={vi.fn()} />)

    expect(screen.getByLabelText('Fornavn')).toHaveValue('Ola')
    expect(container.querySelector('.cv-doc')).toHaveTextContent('Ola Nordmann')
  })

  it('renders exactly one CV document node for the export path to clone', () => {
    const { container } = wrap(<EditorSplit document={fixture()} onPersonaliaChange={vi.fn()} />)
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(1)
  })
})

describe('ExportButton', () => {
  it('prints the node it is given, with a name-derived title', async () => {
    const print = vi.fn(async (options: PrintCvNodeOptions) => void options)
    const doc = fixture()
    doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }

    const node = window.document.createElement('div')
    node.className = 'cv-doc'

    wrap(<ExportButton document={doc} getNode={() => node} print={print} />)
    await userEvent.click(screen.getByRole('button', { name: 'Last ned PDF' }))

    expect(print).toHaveBeenCalledTimes(1)
    expect(print.mock.calls[0]![0]).toMatchObject({
      node,
      title: 'Ola_Nordmann_CV',
      paper: 'a4',
      lang: 'no',
    })
  })

  it('does nothing when there is no node to print', async () => {
    const print = vi.fn(async (options: PrintCvNodeOptions) => void options)
    wrap(<ExportButton document={fixture()} getNode={() => null} print={print} />)
    await userEvent.click(screen.getByRole('button', { name: 'Last ned PDF' }))
    expect(print).not.toHaveBeenCalled()
  })

  it('uses the CV language, not the UI language, for the printed document', async () => {
    const print = vi.fn(async (options: PrintCvNodeOptions) => void options)
    const doc = { ...fixture(), language: 'en' as const }
    const node = window.document.createElement('div')

    wrap(<ExportButton document={doc} getNode={() => node} print={print} />)
    await userEvent.click(screen.getByRole('button', { name: 'Last ned PDF' }))

    expect(print.mock.calls[0]![0]).toMatchObject({ lang: 'en' })
  })
})
