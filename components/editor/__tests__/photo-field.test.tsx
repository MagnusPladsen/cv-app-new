import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PhotoField } from '@/components/editor/PhotoField'
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
    photo: undefined,
    showPhoto: true,
    onChange: vi.fn(),
    onToggle: vi.fn(),
    onRemove: vi.fn(),
    compress: vi.fn(async () => 'data:image/jpeg;base64,SMALL'),
    ...overrides,
  }
}

const image = () => new File(['x'], 'me.png', { type: 'image/png' })

describe('PhotoField', () => {
  it('offers upload when there is no photo', () => {
    wrap(<PhotoField {...props()} />)
    expect(screen.getByText('Last opp bilde')).toBeInTheDocument()
  })

  it('offers replace and remove when a photo is set', () => {
    wrap(<PhotoField {...props({ photo: { dataUrl: 'data:image/png;base64,AA' } })} />)
    expect(screen.getByText('Bytt bilde')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fjern bilde' })).toBeInTheDocument()
  })

  it('compresses a chosen image before reporting it', async () => {
    const p = props()
    wrap(<PhotoField {...p} />)

    await userEvent.upload(screen.getByLabelText('Last opp bilde'), image())

    expect(p.compress).toHaveBeenCalledTimes(1)
    expect(p.onChange).toHaveBeenCalledWith('data:image/jpeg;base64,SMALL')
  })

  it('rejects a non-image file without calling onChange', async () => {
    const p = props()
    wrap(<PhotoField {...p} />)

    // fireEvent, not userEvent: userEvent honours accept="image/*" and would
    // never deliver the file. The guard exists for the paths that bypass
    // accept, such as drag-and-drop or an "All files" picker.
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText('Last opp bilde')
    fireEvent.change(input, { target: { files: [pdf] } })

    expect(await screen.findByText('Filen er ikke et bilde.')).toBeInTheDocument()
    expect(p.onChange).not.toHaveBeenCalled()
    expect(p.compress).not.toHaveBeenCalled()
  })

  it('reports a compression failure without throwing', async () => {
    const p = props({
      compress: vi.fn(async () => {
        throw new Error('broken')
      }),
    })
    wrap(<PhotoField {...p} />)

    await userEvent.upload(screen.getByLabelText('Last opp bilde'), image())

    expect(screen.getByText('Klarte ikke å lese bildet.')).toBeInTheDocument()
    expect(p.onChange).not.toHaveBeenCalled()
  })

  it('toggles visibility', async () => {
    const p = props()
    wrap(<PhotoField {...p} />)
    await userEvent.click(screen.getByLabelText('Vis bilde på CV-en'))
    expect(p.onToggle).toHaveBeenCalledWith(false)
  })

  it('notes the Norwegian convention', () => {
    wrap(<PhotoField {...props()} />)
    expect(
      screen.getByText('Norske arbeidsgivere forventer sjelden bilde.'),
    ).toBeInTheDocument()
  })

  it('removes the photo', async () => {
    const p = props({ photo: { dataUrl: 'data:image/png;base64,AA' } })
    wrap(<PhotoField {...p} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fjern bilde' }))
    expect(p.onRemove).toHaveBeenCalledTimes(1)
  })
})
