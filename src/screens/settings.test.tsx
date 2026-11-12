import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { load } from '../lib/storage'
import { EquipmentScreen } from './equipment/EquipmentScreen'
import { LocationScreen } from './location/LocationScreen'
import { SkyScreen } from './sky/SkyScreen'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Location screen', () => {
  it('starts on the default location', () => {
    render(<LocationScreen />)
    expect(screen.getByText('London')).toBeInTheDocument()
  })

  it('saves coordinates entered by hand, and rejects bad ones', () => {
    render(<LocationScreen />)
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '95' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use these coordinates' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/between -90 and 90/)

    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '55.95' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-3.19' } })
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Edinburgh' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use these coordinates' }))
    expect(load('place', null)).toMatchObject({ lat: 55.95, lon: -3.19, name: 'Edinburgh', source: 'manual' })
  })

  it('finds towns and picks one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ results: [{ name: 'York', latitude: 53.96, longitude: -1.08, country: 'United Kingdom' }] }),
          ),
        ),
      ),
    )
    render(<LocationScreen />)
    fireEvent.change(screen.getByLabelText('Town or city'), { target: { value: 'York' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(await screen.findByRole('button', { name: /York/ }))
    expect(load('place', null)).toMatchObject({ name: 'York', source: 'search' })
  })

  it('explains when town search is offline', async () => {
    render(<LocationScreen />)
    fireEvent.change(screen.getByLabelText('Town or city'), { target: { value: 'York' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText(/Town search isn’t available/)).toBeInTheDocument()
  })

  it('falls back to the IP location when the device won’t share one', async () => {
    vi.stubGlobal('navigator', { geolocation: undefined })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ latitude: '52.2', longitude: '0.12', city: 'Cambridge' })))),
    )
    render(<LocationScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))
    await waitFor(() => expect(load('place', null)).toMatchObject({ name: 'Cambridge', source: 'ip' }))
  })
})

describe('Sky screen', () => {
  const NOW = new Date(2026, 10, 12, 21)

  it('saves sky brightness, filter and the moon filter', () => {
    render(<SkyScreen now={NOW} />)
    fireEvent.click(screen.getByRole('radio', { name: /^8 ?City/ }))
    fireEvent.click(screen.getByRole('radio', { name: /^OIII/ }))
    fireEvent.click(screen.getByRole('switch', { name: /Hide targets the Moon washes out/ }))
    expect(load('sky', null)).toMatchObject({ bortle: 8, filter: 'oiii', hideMoonWashed: true })
  })

  it('plans for another night and back to tonight', () => {
    render(<SkyScreen now={NOW} />)
    expect(screen.getByText('Thursday 12 November')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Night of'), { target: { value: '2026-11-20' } })
    expect(screen.getByText('Friday 20 November')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tonight' }))
    expect(load('sky', null)).toMatchObject({ date: null })
  })

  it('copes with settings saved before new fields existed', () => {
    localStorage.setItem('skyshot:sky', JSON.stringify({ bortle: 3, filter: 'none' }))
    render(<SkyScreen now={NOW} />)
    expect(screen.getByRole('radio', { name: /^3 ?Rural/ })).toBeChecked()
    expect(screen.getByRole('switch')).not.toBeChecked()
  })
})

describe('Equipment screen', () => {
  it('lists every preset by kind and saves the choice', () => {
    const onDone = vi.fn()
    render(<EquipmentScreen onDone={onDone} />)
    expect(screen.getByRole('radio', { name: /Seestar S50/ })).toBeChecked()
    expect(screen.getByRole('group', { name: 'Binoculars' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Dwarf 3/ }))
    expect(load('equipment', null)).toBe('dwarf-3')
    fireEvent.click(screen.getByRole('button', { name: 'See tonight’s targets' }))
    expect(onDone).toHaveBeenCalled()
  })
})
