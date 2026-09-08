import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SectionSettings } from '@/components/editor/SectionSettings'
import { getCvLabels } from '@/lib/cv-labels'
import type { Section } from '@/lib/schema/cv'
import messages from '@/messages/no.json'

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const experience: Section = { id: 's1', type: 'experience', enabled: true, entries: [] }
const custom: Section = {
  id: 's2',
  type: 'custom',
  enabled: true,
  title: 'Publikasjoner',
  shape: 'bullets',
  bullets: [],
}

function draw(section: Section) {
  const onRename = vi.fn()
  const onShapeChange = vi.fn()
  wrap(
    <SectionSettings
      labels={getCvLabels('no')}
      onRename={onRename}
      onShapeChange={onShapeChange}
      section={section}
    />,
  )
  return { onRename, onShapeChange }
}

describe('SectionSettings', () => {
  it('shows the localized heading for a built-in section', () => {
    draw(experience)
    expect(screen.getByLabelText('Overskrift på CV-en')).toHaveValue('Arbeidserfaring')
  })

  it('shows an existing override rather than the label', () => {
    draw({ ...experience, titleOverride: 'Relevant erfaring' })
    expect(screen.getByLabelText('Overskrift på CV-en')).toHaveValue('Relevant erfaring')
  })

  it('reports a rename', async () => {
    const { onRename } = draw(experience)
    await userEvent.type(screen.getByLabelText('Overskrift på CV-en'), 'X')
    expect(onRename).toHaveBeenCalledWith('s1', 'ArbeidserfaringX')
  })

  it('says the rename affects only this CV', () => {
    draw(experience)
    expect(screen.getByText('Gjelder bare denne CV-en.')).toBeInTheDocument()
  })

  it('offers no shape picker for a built-in section', () => {
    draw(experience)
    expect(screen.queryByLabelText('Innhold')).toBeNull()
  })

  it('offers all three shapes for a custom section', async () => {
    const { onShapeChange } = draw(custom)
    const select = screen.getByLabelText('Innhold')
    expect(select).toHaveValue('bullets')

    await userEvent.selectOptions(select, 'Oppføringer med datoer')
    expect(onShapeChange).toHaveBeenCalledWith('s2', 'entries')
  })

  it('uses the custom section title as its heading', () => {
    draw(custom)
    expect(screen.getByLabelText('Overskrift på CV-en')).toHaveValue('Publikasjoner')
  })
})

describe('renaming end to end', () => {
  /** A stateful host, because the field is controlled. */
  function Live() {
    const [section, setSection] = useState<Section>(experience)
    return (
      <SectionSettings
        labels={getCvLabels('no')}
        onRename={(_id, title) => setSection((s) => ({ ...s, titleOverride: title }))}
        onShapeChange={vi.fn()}
        section={section}
      />
    )
  }

  it('lets a user replace the heading entirely', async () => {
    wrap(<Live />)
    const field = screen.getByLabelText('Overskrift på CV-en')

    await userEvent.clear(field)
    await userEvent.type(field, 'Erfaring')

    expect(field).toHaveValue('Erfaring')
  })
})
