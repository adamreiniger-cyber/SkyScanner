import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  afterEach(() => localStorage.clear())

  it('shows the four priority screens in the nav', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav).toHaveTextContent(/Targets.*Location.*Sky.*Equipment/)
  })

  it('switches screens', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Equipment' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Equipment')
  })

  it('toggles red night mode and remembers it', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Red night mode/ }))
    expect(document.documentElement.dataset.theme).toBe('night')
    unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: /Red night mode/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
