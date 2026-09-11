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
    expect(container.querySelector('[data-cv-preview] .cv-doc')).toHaveTextContent(
      'Ola Nordmann',
    )
  })

  it('renders exactly one CV document inside the preview, for export to clone', () => {
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)
    expect(container.querySelectorAll('[data-cv-preview] .cv-doc')).toHaveLength(1)
  })

  it('mounts exactly one CV, inside the preview container', () => {
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)

    // Export clones the .cv-doc it finds. The template strip used to render
    // one per template, and keeping those out of the preview container was
    // the only thing stopping the wrong one being cloned; the strip shows
    // stills now, so there is exactly one document on the page.
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(1)
    expect(container.querySelectorAll('[data-cv-preview] .cv-doc')).toHaveLength(1)
  })

  it('keeps the page guides outside the node the print path clones', () => {
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)
    const printedNode = container.querySelector('[data-cv-preview] .cv-doc')!
    expect(printedNode.querySelector('[data-testid="page-guide"]')).toBeNull()
  })

  it('shows a page count', () => {
    wrap(<EditorSplit {...splitProps(fixture())} />)
    expect(screen.getByText('1 side')).toBeInTheDocument()
  })

  it('renders a form for every switched-on section at once', () => {
    // It used to render only the active one, so each section switched on
    // replaced the last and the editor looked able to hold exactly one.
    const doc = fixture()
    wrap(<EditorSplit {...splitProps(doc)} />)

    const enabled = doc.sections.filter((section) => section.enabled)
    expect(enabled.length).toBeGreaterThan(1)

    // The summary's textarea and a list section's add button, together.
    expect(screen.getByLabelText('Om meg')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Legg til' }).length).toBeGreaterThan(0)
  })

  it('renders them in the order they appear on the CV', () => {
    const doc = fixture()
    const { container } = wrap(<EditorSplit {...splitProps(doc)} />)

    const rendered = [...container.querySelectorAll('[id^=section-form-]')].map((node) =>
      node.id.replace('section-form-', ''),
    )
    const expected = doc.sections.filter((section) => section.enabled).map((section) => section.id)

    expect(rendered).toEqual(expected)
  })

  it('renders no form for a section that is switched off', () => {
    const doc = fixture()
    for (const section of doc.sections) section.enabled = false
    const { container } = wrap(<EditorSplit {...splitProps(doc)} />)

    expect(container.querySelectorAll('[id^=section-form-]')).toHaveLength(0)
    expect(screen.getByText(messages.editor.noSections)).toBeInTheDocument()
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

describe('button affordances', () => {
  it('gives the primary actions an icon, not text alone', () => {
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)

    // lucide renders inline SVGs; a toolbar of bare text buttons is what this
    // guards against.
    const exportButton = screen.getByRole('button', { name: 'Last ned PDF' })
    expect(exportButton.querySelector('svg')).not.toBeNull()

    for (const name of ['Angre', 'Gjør om', 'Legg til egen seksjon']) {
      expect(
        screen.getByRole('button', { name }).querySelector('svg'),
        `${name} has no icon`,
      ).not.toBeNull()
    }

    expect(container.querySelectorAll('svg').length).toBeGreaterThan(5)
  })
})
