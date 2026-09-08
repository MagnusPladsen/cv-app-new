import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TEMPLATES } from '@/components/cv/templates'
import { TemplateStrip } from '@/components/editor/TemplateStrip'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

function fixture(templateId = 'oslo'): CvDocumentData {
  let counter = 0
  const doc = createEmptyDocument({}, { newId: () => `id-${++counter}`, now: () => 0 })
  return { ...doc, theme: { ...doc.theme, templateId } }
}

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('TemplateStrip', () => {
  it('shows a few templates plus a way into the rest', () => {
    wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)

    const shown = TEMPLATES.filter((template) =>
      screen.queryByRole('button', { name: template.name }),
    )
    expect(shown.length).toBeGreaterThanOrEqual(3)
    expect(shown.length).toBeLessThan(TEMPLATES.length)

    const remaining = TEMPLATES.length - shown.length
    expect(
      screen.getByRole('button', { name: `Vis ${remaining} maler til` }),
    ).toBeInTheDocument()
  })

  it('opens every template in a dialog', async () => {
    wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)
    const remaining = TEMPLATES.length - 4

    await userEvent.click(screen.getByRole('button', { name: `Vis ${remaining} maler til` }))

    const dialog = screen.getByRole('dialog')
    for (const template of TEMPLATES) {
      expect(within(dialog).getByRole('button', { name: template.name })).toBeInTheDocument()
    }
  })

  it('keeps the active template visible even when it sits outside the first few', () => {
    wrap(<TemplateStrip document={fixture('studio')} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Studio' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('closes the dialog after choosing from it', async () => {
    const onSelect = vi.fn()
    wrap(<TemplateStrip document={fixture()} onSelect={onSelect} />)
    const remaining = TEMPLATES.length - 4

    await userEvent.click(screen.getByRole('button', { name: `Vis ${remaining} maler til` }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Studio' }),
    )

    expect(onSelect).toHaveBeenCalledWith('studio')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('marks the active template', () => {
    wrap(<TemplateStrip document={fixture('bergen')} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Bergen' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Oslo' })).not.toHaveAttribute('aria-current')
  })

  it('reports a selection', async () => {
    const onSelect = vi.fn()
    wrap(<TemplateStrip document={fixture()} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fjord' }))
    expect(onSelect).toHaveBeenCalledWith('fjord')
  })

  it('previews demo content, never the empty CV being edited', () => {
    // A new CV is blank, and a blank sheet shows nothing about a template
    // except its colour.
    const { container } = wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)

    expect(container.textContent).toContain('Ingrid')
    expect(container.querySelectorAll('.cv-doc').length).toBeGreaterThan(0)
  })

  it('renders each visible thumbnail in its own template', () => {
    const { container } = wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)
    for (const template of TEMPLATES.slice(0, 4)) {
      expect(container.querySelector(`.cv-doc--${template.id}`)).not.toBeNull()
    }
  })

  it('follows the document paper size in its previews', () => {
    const { container } = wrap(
      <TemplateStrip document={{ ...fixture(), paper: 'letter' }} onSelect={vi.fn()} />,
    )
    const root = container.querySelector('.cv-doc') as HTMLElement
    expect(root.style.getPropertyValue('--cv-page-width')).toBe('215.9mm')
  })
})
