import { afterEach, describe, expect, it, vi } from 'vitest'
import { load, save } from './storage'

describe('storage', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('round-trips values', () => {
    save('nightMode', true)
    expect(load('nightMode', false)).toBe(true)
  })

  it('returns the fallback when nothing is stored', () => {
    expect(load('missing', 42)).toBe(42)
  })

  it('returns the fallback on corrupt data', () => {
    localStorage.setItem('skyshot:bad', '{not json')
    expect(load('bad', 'ok')).toBe('ok')
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => save('x', 1)).not.toThrow()
  })
})
