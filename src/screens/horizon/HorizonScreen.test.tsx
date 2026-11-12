import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TargetsScreen } from '../targets/TargetsScreen'
import { HorizonScreen } from './HorizonScreen'

const NOW = new Date(2026, 10, 12, 21, 0)

describe('Horizon screen', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline')))))
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('blocks and reopens directions, and saves them', () => {
    render(<HorizonScreen />)
    expect(screen.getByText('All directions open')).toBeInTheDocument()
    for (const name of ['North', 'North-east', 'North-west', 'West']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}:`) }))
    }
    expect(screen.getByText('E to SW open')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'North: blocked' })).toHaveAttribute('aria-pressed', 'false')
    expect(JSON.parse(localStorage.getItem('skyshot:horizon')!).open).toEqual([false, false, true, true, true, true, false, false])
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }))
    expect(screen.getByText('All directions open')).toBeInTheDocument()
  })

  it('drops targets that stay behind the horizon from the list', () => {
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    expect(screen.getByRole('button', { name: /Bode’s Galaxy/ })).toBeInTheDocument()
    localStorage.clear()
  })

  it('says how many targets are hidden and links to the Horizon tab', () => {
    localStorage.setItem('skyshot:horizon', JSON.stringify({ open: [false, false, true, true, true, true, false, false], minAlt: 0 }))
    const onNavigate = vi.fn()
    render(<TargetsScreen onNavigate={onNavigate} now={NOW} />)
    // M81 is circumpolar from London and never leaves the northern sky.
    expect(screen.queryByRole('button', { name: /Bode’s Galaxy/ })).not.toBeInTheDocument()
    expect(screen.getByText(/targets? stays? behind your horizon/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change horizon' }))
    expect(onNavigate).toHaveBeenCalledWith('horizon')
    expect(screen.getByRole('button', { name: 'E to SW open' })).toBeInTheDocument()
  })
})
