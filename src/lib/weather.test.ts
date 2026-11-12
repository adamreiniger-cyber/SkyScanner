import { describe, expect, it } from 'vitest'
import { cloudLookup, nightOutlook, parseWeather, weatherLookup, weatherUrl, type Hour } from './weather'
import { conditionsFactor } from './score'

const calm: Hour = { cloud: 10, humidity: 70, dewSpread: 5, wind: 8, gusts: 12, rain: 0, jet: 40 }

describe('weather forecast', () => {
  const json = {
    hourly: {
      time: ['2026-11-12T21:00', '2026-11-12T22:00'],
      cloud_cover: [20, 80],
      temperature_2m: [6, 5],
      dew_point_2m: [3, 4.5],
      wind_speed_10m: [10, 12],
      wind_gusts_10m: [20, 45],
      precipitation_probability: [0, 60],
      wind_speed_250hPa: [50, 170],
    },
  }

  it('asks Open-Meteo for cloud, dew, wind, rain and the jet stream for a week', () => {
    const url = weatherUrl(51.5, -0.12)
    for (const v of ['cloud_cover', 'dew_point_2m', 'wind_gusts_10m', 'precipitation_probability', 'wind_speed_250hPa'])
      expect(url).toContain(v)
    expect(url).toContain('forecast_days=7')
  })

  it('parses GMT hours and looks up the hour a time falls in', () => {
    const at = weatherLookup(parseWeather(json))
    const cloudAt = cloudLookup(at)
    expect(cloudAt(new Date(Date.UTC(2026, 10, 12, 21, 40)))).toBe(20)
    expect(cloudAt(new Date(Date.UTC(2026, 10, 12, 22, 5)))).toBe(80)
    expect(cloudAt(new Date(Date.UTC(2026, 10, 13, 5)))).toBeNull()
    expect(at(new Date(Date.UTC(2026, 10, 12, 22)))!.dewSpread).toBeCloseTo(0.5)
  })

  it('keeps cloud even when other fields are missing', () => {
    const at = weatherLookup(parseWeather({ hourly: { time: ['2026-11-12T21:00'], cloud_cover: [5] } }))
    expect(at(new Date(Date.UTC(2026, 10, 12, 21)))).toMatchObject({ cloud: 5, gusts: null, jet: null })
  })

  it('treats a bad response as no forecast', () => {
    expect(parseWeather(null)).toBeNull()
    expect(parseWeather({ hourly: { time: 'x' } })).toBeNull()
    expect(weatherLookup(null)(new Date())).toBeNull()
  })
})

describe('conditions factor', () => {
  it('is perfect on a calm, dry night and null with no forecast', () => {
    expect(conditionsFactor(calm, 'galaxy', true)).toBe(1)
    expect(conditionsFactor(null, 'galaxy', true)).toBeNull()
  })
  it('marks down rain, dew and wind, and wind more for imaging', () => {
    expect(conditionsFactor({ ...calm, rain: 80 }, 'galaxy', true)).toBeLessThan(0.5)
    expect(conditionsFactor({ ...calm, dewSpread: 0.5 }, 'galaxy', true)).toBeLessThan(0.8)
    const gusty = { ...calm, gusts: 45 }
    expect(conditionsFactor(gusty, 'galaxy', true)).toBeLessThan(conditionsFactor(gusty, 'galaxy', false)!)
  })
  it('only lets the jet stream spoil high-magnification targets', () => {
    const jet = { ...calm, jet: 170 }
    expect(conditionsFactor(jet, 'planet', false)).toBeLessThan(0.6)
    expect(conditionsFactor(jet, 'galaxy', true)).toBe(1)
  })
})

describe('night outlook', () => {
  const t0 = Date.UTC(2026, 10, 12, 18)
  // Six dark hours: clear until 21:00, then cloud rolls in with gusts.
  const samples = Array.from({ length: 6 * 6 }, (_, i) => ({ time: new Date(t0 + i * 600_000), sunAlt: -20 }))
  const cover = [0, 10, 20, 90, 95, 100]
  const at = (time: Date): Hour => {
    const i = Math.floor((time.getTime() - t0) / 3_600_000)
    return { ...calm, cloud: cover[i], gusts: i > 2 ? 40 : 10 }
  }

  it('sums up cloud, the clearest stretch and the wind', () => {
    const o = nightOutlook(samples, at, 'tonight', 'UTC')
    expect(o.headline).toBe('Mostly cloudy tonight')
    expect(o.level).toBe('mixed')
    expect(o.details).toEqual(['53% cloud on average', 'clearest 18:00–21:00', 'gusts to 40 km/h'])
  })

  it('says so when there is no forecast', () => {
    const o = nightOutlook(samples, () => null, 'tonight')
    expect(o.level).toBe('none')
  })

  it('ignores daylight hours', () => {
    const day = samples.map((s) => ({ ...s, sunAlt: 10 }))
    expect(nightOutlook(day, at, 'tonight').level).toBe('none')
  })
})
