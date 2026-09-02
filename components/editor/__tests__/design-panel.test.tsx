import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DesignPanel } from '@/components/editor/DesignPanel'
import { TEMPLATES, getTemplate } from '@/components/cv/templates'
import { FONT_PAIRS } from '@/lib/theme/fonts'
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
    theme: {
      templateId: 'oslo',
      accent: '#1e3a8a',
      fontPairId: 'inter',
      density: 'normal' as const,
    },
    paper: 'a4' as const,
    onThemeChange: vi.fn(),
    onPaperChange: vi.fn(),
    ...overrides,
  }
}

describe('DesignPanel', () => {
  it('offers every registered template', () => {
    wrap(<DesignPanel {...props()} />)
    const select = screen.getByLabelText('Mal')
    for (const template of TEMPLATES) {
      expect(within(select).getByRole('option', { name: template.name })).toBeInTheDocument()
    }
  })

  it('reports a template change', async () => {
    const p = props()
    wrap(<DesignPanel {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Mal'), 'Oslo')
    expect(p.onThemeChange).toHaveBeenCalledWith({ templateId: 'oslo' })
  })

  it('shows the active template swatches', () => {
    wrap(<DesignPanel {...props()} />)
    for (const swatch of getTemplate('oslo').swatches) {
      expect(screen.getByRole('button', { name: swatch })).toBeInTheDocument()
    }
  })

  it('reports a swatch choice', async () => {
    const p = props()
    wrap(<DesignPanel {...p} />)
    const swatch = getTemplate('oslo').swatches[1]!
    await userEvent.click(screen.getByRole('button', { name: swatch }))
    expect(p.onThemeChange).toHaveBeenCalledWith({ accent: swatch })
  })

  it('marks the active swatch as pressed', () => {
    const swatch = getTemplate('oslo').swatches[0]!
    wrap(<DesignPanel {...props({ theme: { ...props().theme, accent: swatch } })} />)
    expect(screen.getByRole('button', { name: swatch })).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers a custom colour input', () => {
    wrap(<DesignPanel {...props()} />)
    expect(screen.getByLabelText('Egen farge')).toHaveAttribute('type', 'color')
  })

  it('offers every font pairing', () => {
    wrap(<DesignPanel {...props()} />)
    const select = screen.getByLabelText('Skrift')
    for (const pair of FONT_PAIRS) {
      expect(within(select).getByRole('option', { name: pair.name })).toBeInTheDocument()
    }
  })

  it('reports a density change', async () => {
    const p = props()
    wrap(<DesignPanel {...p} />)
    await userEvent.selectOptions(screen.getByLabelText('Tetthet'), 'Tett')
    expect(p.onThemeChange).toHaveBeenCalledWith({ density: 'compact' })
  })

  it('offers both paper sizes and reports a change', async () => {
    const p = props()
    wrap(<DesignPanel {...p} />)
    const select = screen.getByLabelText('Papir')
    expect(within(select).getByRole('option', { name: 'A4' })).toBeInTheDocument()
    await userEvent.selectOptions(select, 'Letter')
    expect(p.onPaperChange).toHaveBeenCalledWith('letter')
  })

  it('warns when the accent is unreadable on white paper', () => {
    wrap(<DesignPanel {...props({ theme: { ...props().theme, accent: '#f5f5b0' } })} />)
    expect(
      screen.getByText(
        'Denne fargen har lav kontrast mot hvitt og kan bli vanskelig å lese på papir.',
      ),
    ).toBeInTheDocument()
  })

  it('stays quiet for an accent with enough contrast', () => {
    wrap(<DesignPanel {...props()} />)
    expect(
      screen.queryByText(
        'Denne fargen har lav kontrast mot hvitt og kan bli vanskelig å lese på papir.',
      ),
    ).toBeNull()
  })
})

describe('DesignPanel disclosure', () => {
  it('starts collapsed so the editor opens on content, not styling', () => {
    const { container } = wrap(<DesignPanel {...props()} />)
    const details = container.querySelector('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')
  })

  it('keeps its controls reachable while collapsed', () => {
    wrap(<DesignPanel {...props()} />)
    expect(screen.getByLabelText('Mal')).toBeInTheDocument()
  })
})
