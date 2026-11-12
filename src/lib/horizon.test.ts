import { describe, expect, it } from 'vitest'
import { canSee, DEFAULT_HORIZON, describeHorizon, isOpen, sectorOf, withHorizonDefaults } from './horizon'

const garden = { open: [false, false, true, true, true, true, false, false], minAlt: 0 } // E to SW

describe('horizon', () => {
  it('maps azimuths to compass sectors', () => {
    expect([0, 22, 23, 90, 180, 225, 337, 338, 359, -10].map(sectorOf)).toEqual([0, 0, 1, 2, 4, 5, 7, 0, 0, 0])
  })

  it('sees only through open directions and above the trees', () => {
    expect(canSee(garden, 180, 20)).toBe(true)
    expect(canSee(garden, 0, 60)).toBe(false)
    expect(canSee({ ...garden, minAlt: 25 }, 180, 20)).toBe(false)
  })

  it('treats a fully open horizon as no change', () => {
    expect(isOpen(DEFAULT_HORIZON)).toBe(true)
    expect(isOpen(garden)).toBe(false)
    expect(isOpen({ ...DEFAULT_HORIZON, minAlt: 10 })).toBe(false)
  })

  it('describes runs of open sectors, including across north', () => {
    expect(describeHorizon(garden)).toBe('E to SW open')
    expect(describeHorizon({ open: [true, false, false, false, false, false, true, true], minAlt: 15 })).toBe('W to N open, above 15°')
    expect(describeHorizon(DEFAULT_HORIZON)).toBe('All directions open')
  })

  it('repairs bad saved values', () => {
    expect(withHorizonDefaults(null)).toEqual(DEFAULT_HORIZON)
    expect(withHorizonDefaults({ open: [true], minAlt: 99 })).toEqual({ ...DEFAULT_HORIZON, minAlt: 60 })
  })
})
