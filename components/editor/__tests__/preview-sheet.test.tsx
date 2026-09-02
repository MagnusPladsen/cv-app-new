import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { createRef, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EditorSplit } from '@/components/editor/EditorSplit'
import { PreviewSheet } from '@/components/editor/PreviewSheet'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(): CvDocumentData {
  let counter = 0
  return createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })
}

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

/** happy-dom has no matchMedia, so the layout is driven explicitly. */
function setViewport(isDesktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: isDesktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  // @ts-expect-error - restoring the absent happy-dom default
  delete window.matchMedia
})

function editorHandlers() {
  return new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
    get: (target, key: string) => (target[key] ??= vi.fn()),
  }) as unknown as DocumentEditorHandlers
}

function splitProps(doc: CvDocumentData) {
  return {
    document: doc,
    activeSectionId: doc.sections[0]!.id,
    onSelectSection: vi.fn(),
    handlers: editorHandlers(),
  }
}

describe('PreviewSheet', () => {
  it('renders nothing while closed', () => {
    const { container } = wrap(
      <PreviewSheet
        containerRef={createRef<HTMLDivElement>()}
        document={fixture()}
        onOpenChange={vi.fn()}
        open={false}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a modal dialog when open', () => {
    wrap(
      <PreviewSheet
        containerRef={createRef<HTMLDivElement>()}
        document={fixture()}
        onOpenChange={vi.fn()}
        open
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('closes on the close button', async () => {
    const onOpenChange = vi.fn()
    wrap(
      <PreviewSheet
        containerRef={createRef<HTMLDivElement>()}
        document={fixture()}
        onOpenChange={onOpenChange}
        open
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Lukk' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    wrap(
      <PreviewSheet
        containerRef={createRef<HTMLDivElement>()}
        document={fixture()}
        onOpenChange={onOpenChange}
        open
      />,
    )
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('EditorSplit layout', () => {
  it('mounts exactly one CV document on desktop', () => {
    setViewport(true)
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(1)
  })

  it('mounts no CV document on mobile until the sheet is opened', () => {
    setViewport(false)
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Forhåndsvis' })).toBeInTheDocument()
  })

  it('mounts exactly one CV document once the mobile sheet is open', async () => {
    setViewport(false)
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)

    await userEvent.click(screen.getByRole('button', { name: 'Forhåndsvis' }))
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(1)
  })

  it('closes the mobile sheet again', async () => {
    setViewport(false)
    const { container } = wrap(<EditorSplit {...splitProps(fixture())} />)

    await userEvent.click(screen.getByRole('button', { name: 'Forhåndsvis' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lukk' }))
    expect(container.querySelectorAll('.cv-doc')).toHaveLength(0)
  })
})
