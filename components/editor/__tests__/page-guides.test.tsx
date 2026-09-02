import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageGuides } from '@/components/editor/PageGuides'
import { mmToPx, usableHeightMm } from '@/lib/print/paper'

describe('PageGuides', () => {
  it('draws nothing for content that fits one page', () => {
    const { container } = render(<PageGuides contentHeightMm={100} paper="a4" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws one guide for two pages', () => {
    render(<PageGuides contentHeightMm={usableHeightMm('a4') + 10} paper="a4" />)
    expect(screen.getAllByTestId('page-guide')).toHaveLength(1)
  })

  it('positions the guide at the page boundary', () => {
    render(<PageGuides contentHeightMm={usableHeightMm('a4') + 10} paper="a4" />)
    const guide = screen.getByTestId('page-guide')
    expect(guide).toHaveStyle({ top: `${mmToPx(usableHeightMm('a4'))}px` })
  })

  it('draws two guides for three pages and numbers the following page', () => {
    render(<PageGuides contentHeightMm={usableHeightMm('a4') * 2 + 10} paper="a4" />)
    expect(screen.getAllByTestId('page-guide')).toHaveLength(2)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('uses the shorter Letter page', () => {
    const height = usableHeightMm('letter') + 5
    render(<PageGuides contentHeightMm={height} paper="letter" />)
    expect(screen.getByTestId('page-guide')).toHaveStyle({
      top: `${mmToPx(usableHeightMm('letter'))}px`,
    })
  })

  it('is hidden from assistive technology, being purely decorative', () => {
    const { container } = render(
      <PageGuides contentHeightMm={usableHeightMm('a4') + 10} paper="a4" />,
    )
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
