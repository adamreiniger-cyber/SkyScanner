import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TargetsScreen } from './TargetsScreen'

const NOW = new Date(2026, 10, 12, 21, 0) // 12 Nov 2026, 21:00 London

describe('Targets screen', () => {
  beforeEach(() => {
    // No network: every call fails, and the screen must still work.
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('lists tonight’s targets best first, with the Sun last, even offline', async () => {
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    const rows = screen.getAllByRole('button').filter((b) => b.classList.contains('target-row'))
    expect(rows.at(-1)).toHaveTextContent('The Sun')
    const scores = rows.slice(0, -1).map((b) => Number(b.querySelector('.target-row__score')!.textContent))
    expect(scores.length).toBeGreaterThan(10)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
    expect(await screen.findByText(/No weather forecast for this night in London/)).toBeInTheDocument()
  })

  it('ranks for one chosen hour and shows which way to look', () => {
    localStorage.setItem('skyshot:sky', JSON.stringify({ hour: 18 }))
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    expect(screen.getByRole('heading', { name: 'Best at 18:00' })).toBeInTheDocument()
    // Orion hasn't risen by 18:00 in November.
    expect(screen.getByRole('button', { name: /Orion Nebula/ })).toHaveTextContent('Not at 18:00')
    const top = screen.getAllByRole('button').find((b) => b.classList.contains('target-row'))!
    expect(top).toHaveTextContent(/18:\d\d – 1[89]:\d\d · (N|NE|E|SE|S|SW|W|NW) \d+°/)
  })

  it('copies the list and a target', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy list' }))
    expect(await screen.findByText('Copied')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^SkyShot targets for London/))
    fireEvent.click(screen.getByRole('button', { name: /Orion Nebula/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await screen.findAllByText('Copied')
    expect(writeText).toHaveBeenLastCalledWith(expect.stringMatching(/^M42 Orion Nebula · \d+ \w+\nRA 05h/))
  })

  it('opens a target’s details and goes back', () => {
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /Orion Nebula/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Orion Nebula' })).toBeInTheDocument()
    expect(screen.getByText(/M42 · Emission nebula · Orion/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Why it scores \d+/ })).toBeInTheDocument()
    expect(screen.getByText(/Bigger than the frame/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Stellarium Web/ })).toHaveAttribute(
      'href',
      'https://stellarium-web.org/skysource/M42',
    )
    // Offline, the catalogue description stands in for Wikipedia.
    expect(screen.getByText(/closest large star-forming region/)).toBeInTheDocument()
    expect(screen.getByText('No forecast available. Check the sky before you set up.')).toBeInTheDocument()

    // The back button is only shown below 1024px; jsdom's window is 1024px wide.
    fireEvent.click(screen.getByRole('button', { name: /All targets/, hidden: true }))
    expect(document.querySelector('.targets')).toHaveAttribute('data-view', 'list')
  })

  it('steps to the next target', () => {
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /Orion Nebula/ }))
    const stepper = screen.getByRole('navigation', { name: 'Other targets' })
    const next = within(stepper).getAllByRole('button')[1]
    const nextName = next.textContent!
    fireEvent.click(next)
    expect(screen.getByRole('heading', { level: 2, name: nextName })).toBeInTheDocument()
  })

  it('sends the settings chips to their screens', () => {
    const onNavigate = vi.fn()
    render(<TargetsScreen onNavigate={onNavigate} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: 'London' }))
    fireEvent.click(screen.getByRole('button', { name: 'Seestar S50' }))
    expect(onNavigate.mock.calls).toEqual([['location'], ['equipment']])
  })

  it('uses the Wikipedia summary when it loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(JSON.stringify(
              url.includes('wikipedia')
                ? {
                    extract: 'A summary from Wikipedia.',
                    thumbnail: { source: 'https://upload.wikimedia.org/a/b/320px-M42.jpg', width: 320, height: 240 },
                    originalimage: { source: 'https://upload.wikimedia.org/a/M42.jpg', width: 4000, height: 3000 },
                  }
                : {},
            ), {
            status: 200,
          }),
        ),
      ),
    )
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /Orion Nebula/ }))
    expect(await screen.findByText('A summary from Wikipedia.')).toBeInTheDocument()
    expect(screen.getByText('From Wikipedia')).toBeInTheDocument()
    // The photo appears once, inside the framing preview, with its credit.
    expect(screen.queryByRole('img', { name: 'Photo of Orion Nebula' })).not.toBeInTheDocument()
    const photo = document.querySelector('.framing image.framing__photo:not(.framing__photo--outside)')
    expect(photo).toHaveAttribute('href', 'https://upload.wikimedia.org/a/b/960px-M42.jpg')
    expect(screen.getByText(/where you’ll find its credit and licence/)).toBeInTheDocument()
  })

  it('shows the photo with a note when there is no framing preview', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              url.includes('wikipedia')
                ? { extract: 'A double star.', thumbnail: { source: 'https://upload.wikimedia.org/a/b/320px-Albireo.jpg', width: 320, height: 240 } }
                : {},
            ),
            { status: 200 },
          ),
        ),
      ),
    )
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /Albireo/ }))
    expect(await screen.findByRole('img', { name: 'Photo of Albireo' })).toBeInTheDocument()
    expect(screen.getByText(/Unable to create a framing preview/)).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /Photo of/ })).toHaveLength(1)
  })

  it('plans for the chosen night and can hide moon-washed targets', () => {
    const rows = () => screen.getAllByRole('button').filter((b) => b.classList.contains('target-row')).length
    // Full moon is on 24 Nov 2026.
    localStorage.setItem('skyshot:sky', JSON.stringify({ bortle: 5, filter: 'none', date: '2026-11-24', hideMoonWashed: false }))
    const { unmount } = render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    expect(screen.getByRole('button', { name: /Tue 24 Nov/ })).toBeInTheDocument()
    const all = rows()
    unmount()
    localStorage.setItem('skyshot:sky', JSON.stringify({ bortle: 5, filter: 'none', date: '2026-11-24', hideMoonWashed: true }))
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    expect(rows()).toBeLessThan(all)
    expect(screen.getByRole('button', { name: /The Moon/ })).toBeInTheDocument()
  })

  it('puts a solar safety warning on the Sun', () => {
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /The Sun/ }))
    expect(screen.getByRole('heading', { name: /Never look at the Sun without a solar filter/ })).toBeInTheDocument()
    expect(screen.getByText(/Good today|Great today|Fair today|Poor today/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /SpaceWeatherLive/ })).toBeInTheDocument()
    expect(screen.queryByText('Sky brightness')).not.toBeInTheDocument()
  })

  it('rates the Moon by its phase', () => {
    render(<TargetsScreen onNavigate={() => {}} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /The Moon/ }))
    expect(screen.getByText('Phase')).toBeInTheDocument()
  })
})
