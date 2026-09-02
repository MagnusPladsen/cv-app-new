import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { HistoryControls } from '@/components/editor/HistoryControls'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    canUndo: true,
    canRedo: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...overrides,
  }
}

describe('HistoryControls', () => {
  it('disables both buttons with no history', () => {
    wrap(<HistoryControls {...props({ canUndo: false, canRedo: false })} />)
    expect(screen.getByRole('button', { name: 'Angre' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Gjør om' })).toBeDisabled()
  })

  it('undoes on click', async () => {
    const p = props()
    wrap(<HistoryControls {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Angre' }))
    expect(p.onUndo).toHaveBeenCalledTimes(1)
  })

  it('redoes on click', async () => {
    const p = props()
    wrap(<HistoryControls {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Gjør om' }))
    expect(p.onRedo).toHaveBeenCalledTimes(1)
  })

  it('undoes on Cmd+Z', async () => {
    const p = props()
    wrap(<HistoryControls {...p} />)
    await userEvent.keyboard('{Meta>}z{/Meta}')
    expect(p.onUndo).toHaveBeenCalledTimes(1)
  })

  it('undoes on Ctrl+Z', async () => {
    const p = props()
    wrap(<HistoryControls {...p} />)
    await userEvent.keyboard('{Control>}z{/Control}')
    expect(p.onUndo).toHaveBeenCalledTimes(1)
  })

  it('redoes on Shift+Cmd+Z', async () => {
    const p = props()
    wrap(<HistoryControls {...p} />)
    await userEvent.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}')
    expect(p.onRedo).toHaveBeenCalledTimes(1)
    expect(p.onUndo).not.toHaveBeenCalled()
  })

  it('leaves undo to the browser while focus is in a text field', async () => {
    const p = props()
    wrap(
      <>
        <HistoryControls {...p} />
        <input aria-label="felt" />
      </>,
    )

    await userEvent.click(screen.getByLabelText('felt'))
    await userEvent.keyboard('{Meta>}z{/Meta}')
    expect(p.onUndo).not.toHaveBeenCalled()
  })

  it('ignores a plain z press', async () => {
    const p = props()
    wrap(<HistoryControls {...p} />)
    await userEvent.keyboard('z')
    expect(p.onUndo).not.toHaveBeenCalled()
  })
})
