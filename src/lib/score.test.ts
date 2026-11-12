import { describe, expect, it } from 'vitest'
import { findTarget } from './catalogue'
import {
  altitudeFactor,
  assess,
  combine,
  darknessFactor,
  moonFactor,
  phaseFactor,
  rate,
  skyFactor,
  type SkySettings,
} from './score'
import { compass, computeNight, darkRange, nightStart, phaseName, separation } from './sky'

const LONDON = { lat: 51.5074, lon: -0.1278, name: 'London' }
// 12 Nov 2026, 21:00 UTC (= London time in November).
const TONIGHT = new Date(Date.UTC(2026, 10, 12, 21, 0))
const night = computeNight(LONDON, TONIGHT)
const suburban: SkySettings = { bortle: 5, narrowbandFilter: false }
const m42 = findTarget('m42')!

describe('night geometry', () => {
  it('plans for the coming night, or last night in the small hours', () => {
    const noon = new Date(2026, 10, 12, 12).getTime()
    expect(nightStart(new Date(2026, 10, 12, 21)).getTime()).toBe(noon)
    expect(nightStart(new Date(2026, 10, 13, 3)).getTime()).toBe(noon)
    expect(nightStart(new Date(2026, 10, 12, 9)).getTime()).toBe(noon)
  })

  it('finds the dark hours between sunset and sunrise', () => {
    const [from, to] = darkRange(night.samples)!
    const sunset = night.samples[from].time.getUTCHours()
    const sunrise = night.samples[to].time.getUTCHours()
    expect(sunset).toBe(16) // London sunset in mid-November is about 16:15.
    expect(sunrise).toBe(7) // Sunrise is about 07:20.
  })

  it('has no darkness at midsummer in the Arctic', () => {
    const tromso = computeNight({ lat: 69.65, lon: 18.96, name: 'Tromsø' }, new Date(Date.UTC(2026, 5, 21, 22)))
    expect(darkRange(tromso.samples)).toBeNull()
  })

  it('reports a thin crescent Moon three days after new moon', () => {
    // New moon was on 9 Nov 2026.
    expect(night.moonIllum).toBeGreaterThan(0.05)
    expect(night.moonIllum).toBeLessThan(0.25)
  })

  it('measures angular separation', () => {
    expect(separation(0, 0, 6, 0)).toBeCloseTo(90, 5)
    expect(separation(5, 89, 17, 89)).toBeCloseTo(2, 5)
  })

  it('names compass directions', () => {
    expect(compass(180)).toBe('south')
    expect(compass(135)).toBe('south-east')
    expect(compass(359)).toBe('north')
  })
})

describe('assess', () => {
  const result = assess(night, m42, suburban)

  it('puts the Orion Nebula’s peak at about 33° due south from London', () => {
    expect(result.peak!.alt).toBeGreaterThan(31)
    expect(result.peak!.alt).toBeLessThan(35)
    expect(compass(result.peak!.az)).toBe('south')
  })

  it('places the best window in darkness around the meridian crossing', () => {
    const [from, to] = result.window!
    for (let i = from; i <= to; i++) expect(result.samples[i].sunAlt).toBeLessThan(-12)
    const peakHour = result.peak!.time.getUTCHours()
    expect([0, 1, 2]).toContain(peakHour)
  })

  it('scores a target that never rises as zero', () => {
    const southern = assess(night, { ...m42, id: 'x', dec: -80 }, suburban)
    expect(southern.score).toBe(0)
    expect(southern.window).toBeNull()
  })

  it('scores lower under more cloud', () => {
    const clear = assess(night, m42, suburban, () => 0).score
    const patchy = assess(night, m42, suburban, () => 50).score
    const overcast = assess(night, m42, suburban, () => 100).score
    expect(clear).toBeGreaterThan(patchy)
    expect(patchy).toBeGreaterThan(overcast)
    expect(overcast).toBe(0)
  })

  it('scores lower under a brighter sky, and a filter helps a nebula', () => {
    const dark = assess(night, m42, { bortle: 2, narrowbandFilter: false }).score
    const city = assess(night, m42, { bortle: 8, narrowbandFilter: false }).score
    const cityFiltered = assess(night, m42, { bortle: 8, narrowbandFilter: true }).score
    expect(dark).toBeGreaterThan(city)
    expect(cityFiltered).toBeGreaterThan(city)
  })

  it('ignores the cloud factor when there is no forecast', () => {
    expect(result.factors.find((f) => f.id === 'cloud')!.value).toBeNull()
    expect(result.cloudInWindow).toBeNull()
  })

  it('puts the Sun’s window in daylight, scored only on altitude and cloud', () => {
    const sun = assess(night, findTarget('sun')!, suburban, () => 0)
    expect(sun.daytime).toBe(true)
    expect(sun.window).not.toBeNull()
    expect(sun.samples[sun.window![0]].sunAlt).toBeGreaterThan(0)
    expect(sun.factors.map((f) => f.id)).toEqual(['altitude', 'cloud'])
    expect(sun.score).toBeGreaterThan(0)
  })

  it('keeps night targets in darkness even with the Sun added', () => {
    const orion = assess(night, m42, suburban)
    expect(orion.daytime).toBe(false)
    expect(orion.samples[orion.window![0]].sunAlt).toBeLessThan(0)
  })

  it('rates the Moon on its phase, not on moonlight', () => {
    // 12 Nov 2026 is just after new moon: a thin crescent that sets in twilight.
    expect(assess(night, findTarget('moon')!, suburban).score).toBeLessThan(40)
    // At first quarter (17 Nov) the Moon is well placed in the evening.
    const quarter = assess(computeNight(LONDON, new Date(Date.UTC(2026, 10, 17, 18))), findTarget('moon')!, suburban)
    expect(quarter.window).not.toBeNull()
    expect(quarter.factors.find((f) => f.id === 'moon')!.value).toBe(1)
    expect(quarter.factors.some((f) => f.id === 'sky')).toBe(false)
  })

  it('positions planets with the ephemeris', () => {
    const jupiter = assess(night, findTarget('jupiter')!, suburban)
    expect(jupiter.samples.some((s) => s.alt > 0)).toBe(true)
  })
})

describe('factors', () => {
  it('rewards altitude up to 50°', () => {
    expect(altitudeFactor(5)).toBe(0)
    expect(altitudeFactor(30)).toBeGreaterThan(altitudeFactor(20))
    expect(altitudeFactor(70)).toBe(1)
  })

  it('needs full darkness for galaxies but not for planets', () => {
    expect(darknessFactor(-8, 'galaxy')).toBeLessThan(0.5)
    expect(darknessFactor(-8, 'planet')).toBe(1)
  })

  it('makes moonlight matter less for double stars than galaxies', () => {
    expect(moonFactor(30, 40, 1, 'double-star')).toBeGreaterThan(moonFactor(30, 40, 1, 'galaxy'))
    expect(moonFactor(-5, 40, 1, 'galaxy')).toBe(1)
  })

  it('ranks sky brightness from dark site to city', () => {
    expect(skyFactor({ bortle: 1, narrowbandFilter: false }, 'galaxy')).toBe(1)
    expect(skyFactor({ bortle: 9, narrowbandFilter: false }, 'galaxy')).toBeCloseTo(0.15)
  })

  it('combines factors and skips missing ones', () => {
    expect(combine([{ id: 'altitude', value: 1 }, { id: 'cloud', value: null }])).toBe(100)
    expect(combine([{ id: 'altitude', value: 0 }, { id: 'sky', value: 1 }])).toBe(0)
  })

  it('prefers a quarter Moon to a full or new one', () => {
    expect(phaseFactor(0.5)).toBe(1)
    expect(phaseFactor(1)).toBeCloseTo(0.6)
    expect(phaseFactor(0.01)).toBeLessThan(0.1)
  })

  it('names Moon phases', () => {
    expect([phaseName(0), phaseName(45), phaseName(90), phaseName(180), phaseName(270), phaseName(320)]).toEqual([
      'New Moon',
      'Waxing crescent',
      'First quarter',
      'Full Moon',
      'Last quarter',
      'Waning crescent',
    ])
  })

  it('turns scores into ratings', () => {
    expect([rate(85), rate(65), rate(45), rate(10)]).toEqual(['Great', 'Good', 'Fair', 'Poor'])
  })
})
