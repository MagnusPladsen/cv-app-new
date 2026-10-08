import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AskAi } from '@/components/editor/AskAi'
import { AssistantProvider } from '@/components/editor/assistant-context'
import type { DocumentEditorHandlers } from '@/lib/hooks/use-document-editor'
import { createDemoDocument } from '@/lib/schema/demo'
import messages from '@/messages/no.json'

const handlers = {
  onSummaryChange: vi.fn(),
  onUpdateEntry: vi.fn(),
  onCoverLetterChange: vi.fn(),
  onPersonaliaChange: vi.fn(),
} as unknown as DocumentEditorHandlers

function wrap(ui: ReactNode, withProvider = true) {
  const document = createDemoDocument()
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {withProvider ? (
        <AssistantProvider document={document} handlers={handlers} pages={2}>
          {ui}
        </AssistantProvider>
      ) : (
        ui
      )}
    </NextIntlClientProvider>,
  )
}

const summaryProps = (text: string) => ({
  drafts: [{ kind: 'summary' as const, sectionId: 's1', label: 'Om meg', text }],
  label: 'Skriv om Om meg',
  targets: [{ kind: 'summary' as const, sectionId: 's1', label: 'Om meg' }],
  task: 'summary' as const,
})

afterEach(() => vi.unstubAllGlobals())

describe('AskAi', () => {
  it('renders nothing without the editor context', () => {
    // A form rendered on its own, in a test or anywhere not wired up, gets no
    // button rather than one that cannot work.
    wrap(<AskAi {...summaryProps('Erfaren utvikler')} />, false)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing for an empty field', () => {
    // There is nothing to improve, and the press would be billed anyway.
    wrap(<AskAi {...summaryProps('   ')} />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('sends that field and nothing else', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ answer: 'Ok', suggestions: [] }) })
    vi.stubGlobal('fetch', fetchSpy)

    wrap(<AskAi {...summaryProps('Erfaren utvikler med lang erfaring')} />)
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.askField }))

    const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string)
    expect(body.task).toBe('summary')
    expect(body.passages).toHaveLength(1)
    expect(body.history).toEqual([])
    expect(body.targets).toHaveLength(1)
  })

  it('refuses a field holding a national identity number before any request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    wrap(<AskAi {...summaryProps('Fnr 010190 12345')} />)
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.askField }))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByText(messages.assistant.errorNationalId)).toBeInTheDocument()
  })

  it('says so when the answer carried no suggestion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answer: 'Ok', suggestions: [] }) }),
    )

    wrap(<AskAi {...summaryProps('Erfaren utvikler med lang erfaring')} />)
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.askField }))

    expect(screen.getByText(messages.assistant.askNothing)).toBeInTheDocument()
  })
})
