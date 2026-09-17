import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { ImportCvButton } from '@/components/dashboard/ImportCvButton'
import type { Line } from '@/lib/import/parse-cv'
import messages from '@/messages/no.json'

const extraction = vi.hoisted(() => ({
  result: { ok: true, lines: [] } as
    | { ok: true; lines: Line[] }
    | { ok: false; reason: 'no-text' | 'unreadable' | 'old-word' | 'unsupported' },
}))

vi.mock('@/lib/import/extract', async (original) => ({
  ...(await original<typeof import('@/lib/import/extract')>()),
  extractLines: async () => extraction.result,
}))

async function importLines(lines: string[]) {
  extraction.result = { ok: true, lines: lines.map((text) => ({ text })) }
  const onImport = vi.fn()
  render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <ImportCvButton onImport={onImport} />
    </NextIntlClientProvider>,
  )
  const input = document.querySelector<HTMLInputElement>('input[type=file]')!
  await userEvent.upload(input, new File(['x'], 'cv.docx'))
  return onImport
}

describe('the import review', () => {
  it('says which sections it did not find, and still creates the CV', async () => {
    const onImport = await importLines([
      'Kari Nordmann',
      'kari@example.no',
      'Arbeidserfaring',
      'Prosjektleder, Veidekke · 2019 – 2023',
    ])

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Jobber')
    expect(dialog).toHaveTextContent(/Fant ikke .*utdanning.*ferdigheter.*språk/)

    await userEvent.click(screen.getByRole('button', { name: 'Lag CV-en' }))
    expect(onImport).toHaveBeenCalledOnce()
  })

  it('does not mention missing sections when everything was found', async () => {
    await importLines([
      'Kari Nordmann',
      'kari@example.no',
      'Om meg',
      'Prosjektleder.',
      'Arbeidserfaring',
      'Prosjektleder, Veidekke · 2019 – 2023',
      'Utdanning',
      'Master, NTNU · 2010 – 2013',
      'Ferdigheter',
      'Excel',
      'Språk',
      'Norsk',
      'Interesser',
      'Ski',
    ])
    const dialog = await screen.findByRole('dialog')
    expect(dialog).not.toHaveTextContent('Fant ikke')
  })

  it('explains an old Word file instead of opening the review', async () => {
    extraction.result = { ok: false, reason: 'old-word' }
    render(
      <NextIntlClientProvider locale="no" messages={messages}>
        <ImportCvButton onImport={vi.fn()} />
      </NextIntlClientProvider>,
    )
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!
    await userEvent.upload(input, new File(['x'], 'cv.doc'))
    expect(await screen.findByRole('alert')).toHaveTextContent('.docx')
  })
})
