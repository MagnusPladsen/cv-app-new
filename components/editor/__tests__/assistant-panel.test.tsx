import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AssistantPanel } from '@/components/editor/AssistantPanel'
import { createDemoDocument } from '@/lib/schema/demo'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const handlers = () =>
  ({
    onSummaryChange: vi.fn(),
    onUpdateEntry: vi.fn(),
    onCoverLetterChange: vi.fn(),
    onPersonaliaChange: vi.fn(),
  }) as never

const reply = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body } as Response)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AssistantPanel', () => {
  it('starts shut and sends nothing by existing', () => {
    const fetchSpy = reply({})
    vi.stubGlobal('fetch', fetchSpy)

    wrap(<AssistantPanel document={createDemoDocument()} handlers={handlers()} pages={2} />)

    // Opening the editor must not cost a question.
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText(messages.assistant.placeholder)).toBeNull()
  })

  it('says what is sent before there is an input to type in', async () => {
    vi.stubGlobal('fetch', reply({}))
    wrap(<AssistantPanel document={createDemoDocument()} handlers={handlers()} pages={2} />)

    await userEvent.click(screen.getByRole('button', { name: messages.assistant.title }))

    // The consent in the privacy policy is only real if this is readable
    // without going looking for it.
    expect(screen.getByText(messages.assistant.privacySent)).toBeInTheDocument()
    expect(screen.getByText(messages.assistant.privacyStripped)).toBeInTheDocument()
    expect(screen.getByText(messages.assistant.privacyWhere)).toBeInTheDocument()
  })

  it('refuses a national identity number without calling the route at all', async () => {
    const fetchSpy = reply({})
    vi.stubGlobal('fetch', fetchSpy)
    wrap(<AssistantPanel document={createDemoDocument()} handlers={handlers()} pages={2} />)

    await userEvent.click(screen.getByRole('button', { name: messages.assistant.title }))
    await userEvent.type(
      screen.getByPlaceholderText(messages.assistant.placeholder),
      'Kan jeg skrive 010190 12345',
    )
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.send }))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByText(messages.assistant.errorNationalId)).toBeInTheDocument()
  })

  it('strips the name from the question it does send', async () => {
    const document = createDemoDocument()
    const fetchSpy = reply({ answer: 'Jada.', suggestions: [] })
    vi.stubGlobal('fetch', fetchSpy)
    wrap(<AssistantPanel document={document} handlers={handlers()} pages={2} />)

    await userEvent.click(screen.getByRole('button', { name: messages.assistant.title }))
    await userEvent.type(
      screen.getByPlaceholderText(messages.assistant.placeholder),
      `Jeg heter ${document.personalia.firstName}`,
    )
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.send }))

    const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string)
    expect(body.message).not.toContain(document.personalia.firstName)
    expect(body.message).toContain('[navn]')
    // Three measurements, and no document.
    expect(Object.keys(body.facts).sort()).toEqual(['findings', 'pages', 'paper'])
    expect(body).not.toHaveProperty('document')
  })

  it('names the limit that was hit rather than failing vaguely', async () => {
    vi.stubGlobal('fetch', reply({ error: 'budget', reason: 'chatsPerDay' }, false))
    wrap(<AssistantPanel document={createDemoDocument()} handlers={handlers()} pages={2} />)

    await userEvent.click(screen.getByRole('button', { name: messages.assistant.title }))
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.example1 }))

    expect(screen.getByText(messages.assistant.errorChatsPerDay)).toBeInTheDocument()
  })

  it('shows a suggestion as a diff and writes it only when pressed', async () => {
    const document = createDemoDocument()
    const summary = document.sections.find((section) => section.type === 'summary')!
    const spies = {
      onSummaryChange: vi.fn(),
      onUpdateEntry: vi.fn(),
      onCoverLetterChange: vi.fn(),
      onPersonaliaChange: vi.fn(),
    }
    vi.stubGlobal(
      'fetch',
      reply({
        answer: 'Forslag under.',
        suggestions: [
          {
            kind: 'summary',
            sectionId: summary.id,
            value: 'Frontendutvikler med ti år i finans.',
            why: 'Konkret slår generelt',
          },
        ],
      }),
    )

    wrap(<AssistantPanel document={document} handlers={spies as never} pages={2} />)
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.title }))
    await userEvent.click(screen.getByRole('button', { name: messages.assistant.example1 }))

    expect(screen.getByText('Frontendutvikler med ti år i finans.')).toBeInTheDocument()
    expect(spies.onSummaryChange).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: messages.assistant.apply }))

    expect(spies.onSummaryChange).toHaveBeenCalledWith(
      summary.id,
      'Frontendutvikler med ti år i finans.',
    )
  })
})
