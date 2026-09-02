import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { EditorSplit } from '@/components/editor/EditorSplit'
import { ExportButton } from '@/components/editor/ExportButton'
import { PersonaliaForm } from '@/components/editor/PersonaliaForm'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
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

function editorHandlers() {
  return new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
    get: (target, key: string) => (target[key] ??= vi.fn()),
  })
}

function splitProps(doc: CvDocumentData) {
  return {
    document: doc,
    activeSectionId: doc.sections[0]!.id,
    onSelectSection: vi.fn(),
    // A proxy of auto-created spies stands in for the full handler surface.
    handlers: editorHandlers() as unknown as DocumentEditorHandlers,
  }
}

describe('EditorSplit', () => {
  it('shows the form and a live preview of the same document', () => {
    const doc = fixture()
    doc.personalia = { ...doc.personalia, firstName: 'Ola', lastName: 'Nordmann' }
    const { container } = wrap(<EditorSplit {...splitProps(doc)} />)

    expect(screen.getByLabelText('Fornavn')).toHaveValue('Ola')
    expect(container.querySelector('.cv-doc')).toHaveTextContent('Ola Nordmann')
  })

  it('renders exactly one CV document node for the export path to clone', () => {
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(1)
  })

  it('renders the form for the active section', () => {
    const doc = fixture()
    const skills = doc.sections.find((section) => section.type === 'skills')!
    wrap(<EditorSplit {...splitProps(doc)} activeSectionId={skills.id} />)

    // The skills form's add button, not the summary textarea.
    expect(screen.getByRole('button', { name: 'Legg til' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Om meg')).toBeNull()
  })

  it('swaps the form when a different section becomes active', () => {
    const doc = fixture()
    const summary = doc.sections.find((section) => section.type === 'summary')!
    wrap(<EditorSplit {...splitProps(doc)} activeSectionId={summary.id} />)

    expect(screen.getByLabelText('Om meg')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Legg til' })).toBeNull()
  })

  it('lists every section so any of them can be reached', () => {
    wrap(<EditorSplit {...splitProps(fixture())} />)
    expect(screen.getByText('Seksjoner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Legg til egen seksjon' })).toBeInTheDocument()
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
