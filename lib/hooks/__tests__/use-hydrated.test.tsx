import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useHydrated } from '@/lib/hooks/use-hydrated'

function Probe() {
  return <span>{useHydrated() ? 'hydrated' : 'pending'}</span>
}

describe('useHydrated', () => {
  it('reports hydrated after the effect has run', () => {
    render(<Probe />)
    expect(screen.getByText('hydrated')).toBeInTheDocument()
  })
})
