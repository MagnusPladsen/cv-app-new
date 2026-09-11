import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TEMPLATES, getTemplate } from '@/components/cv/templates'
import { TemplateStrip } from '@/components/editor/TemplateStrip'
import type { CvDocument as CvDocumentData } from '@/lib/schema/cv'
import { createEmptyDocument } from '@/lib/schema/defaults'
import messages from '@/messages/no.json'

/**
 * Display names are branding and change; template ids do not. Reading the name
 * from the registry keeps these tests about behaviour rather than about what
 * the templates happen to be called this month.
 */
function name(templateId: string): string {
  return getTemplate(templateId).name
}

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
    expect(screen.getByRole('button', { name: name('studio') })).toHaveAttribute(
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
      within(screen.getByRole('dialog')).getByRole('button', { name: name('studio') }),
    )

    expect(onSelect).toHaveBeenCalledWith('studio')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('marks the active template', () => {
    wrap(<TemplateStrip document={fixture('bergen')} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: name('bergen') })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: name('oslo') })).not.toHaveAttribute('aria-current')
  })

  it('reports a selection', async () => {
    const onSelect = vi.fn()
    wrap(<TemplateStrip document={fixture()} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: name('fjord') }))
    expect(onSelect).toHaveBeenCalledWith('fjord')
  })

  it('previews demo content, never the empty CV being edited', () => {
    // A new CV is blank, and a blank sheet shows nothing about a template
    // except its colour. The stills are captures of the demo CV, so this now
    // means the strip renders no live document at all - which is also what
    // keeps the export path from ever finding the wrong .cv-doc.
    const { container } = wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)

    expect(container.querySelectorAll('.cv-doc')).toHaveLength(0)
    expect(container.querySelectorAll('img').length).toBeGreaterThan(0)
  })

  it('shows each visible thumbnail its own template’s still', () => {
    const { container } = wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)
    for (const template of TEMPLATES.slice(0, 4)) {
      const button = screen.getByRole('button', { name: template.name })
      const src = decodeURIComponent(button.querySelector('img')?.getAttribute('src') ?? '')
      expect(src, `${template.id} thumbnail`).toContain(`/templates/${template.id}.png`)
    }
    expect(container.querySelectorAll('img').length).toBeGreaterThanOrEqual(4)
  })

  it('stays A4-shaped on letter paper, like the +N tile always has', () => {
    // The strip answers "which template", not "which paper" - the paper is
    // visible in the preview beside it - and the stills are captured at A4.
    const letter = wrap(
      <TemplateStrip document={{ ...fixture(), paper: 'letter' }} onSelect={vi.fn()} />,
    )
    const a4 = wrap(<TemplateStrip document={fixture()} onSelect={vi.fn()} />)

    const shape = (result: ReturnType<typeof wrap>) => {
      const button = within(result.container).getAllByRole('button')[0]!
      return `${button.style.width} x ${button.style.height}`
    }

    expect(shape(letter)).toBe(shape(a4))
  })
})
