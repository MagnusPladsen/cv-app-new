import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { getTemplate } from '@/components/cv/templates'
import { TemplateStartDialog } from '@/components/gallery/TemplateStartDialog'
import messages from '@/messages/no.json'

function open() {
  const handlers = { onStart: vi.fn(), onImport: vi.fn(), onClose: vi.fn() }
  const template = getTemplate('fjord')
  render(
    <NextIntlClientProvider locale="no" messages={messages}>
      <TemplateStartDialog template={template} {...handlers} />
    </NextIntlClientProvider>,
  )
  return { handlers, template }
}

describe('choosing what to do with a template', () => {
  it('names the template and offers starting fresh first', () => {
    const { template } = open()
    const dialog = screen.getByRole('dialog', { name: template.name })
    const start = screen.getByRole('button', { name: 'Start ny CV' })
    expect(dialog).toContainElement(start)
    // Primary, so it has focus: Enter does the common thing.
    expect(start).toHaveFocus()
  })

  it('starts a new CV', async () => {
    const { handlers } = open()
    await userEvent.click(screen.getByRole('button', { name: 'Start ny CV' }))
    expect(handlers.onStart).toHaveBeenCalledOnce()
  })

  it('offers importing as the other way in', () => {
    open()
    expect(screen.getByLabelText('Importer…')).toHaveAttribute('type', 'file')
  })

  it('closes on Escape and from the close button', async () => {
    const { handlers } = open()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Lukk' }))
    expect(handlers.onClose).toHaveBeenCalledTimes(2)
  })
})
