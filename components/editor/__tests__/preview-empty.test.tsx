import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PreviewPane } from '@/components/editor/PreviewPane'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(): CvDocumentData {
  let counter = 0
  return createEmptyDocument({}, { newId: () => `id-${(counter += 1)}`, now: () => 0 })
}

function renderPane(document: CvDocumentData) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <PreviewPane containerRef={createRef<HTMLDivElement>()} document={document} />
    </NextIntlClientProvider>,
  )
}

describe('the preview empty state', () => {
  it('tells the user the preview is live, not stuck', () => {
    // A new CV renders a blank sheet. Correct, but the first thing a user
    // sees of the main feature should not look broken.
    renderPane(fixture())
    expect(screen.getByText(messages.editor.previewEmpty)).toBeInTheDocument()
  })

  it('disappears once there is a name', () => {
    const document = fixture()
    document.personalia = { ...document.personalia, firstName: 'Ola' }

    renderPane(document)
    expect(screen.queryByText(messages.editor.previewEmpty)).toBeNull()
  })

  it('disappears once a section has content, even with no name', () => {
    const document = fixture()
    const summary = document.sections.find((section) => section.type === 'summary')
    if (summary && 'text' in summary) summary.text = 'Sykepleier med ti års erfaring.'

    renderPane(document)
    expect(screen.queryByText(messages.editor.previewEmpty)).toBeNull()
  })

  it('stays outside the element the export clones', () => {
    // Otherwise the hint would be printed onto the PDF.
    const { container } = renderPane(fixture())
    const preview = container.querySelector('[data-cv-preview]')!

    expect(preview.textContent).not.toContain(messages.editor.previewEmpty)
  })
})
