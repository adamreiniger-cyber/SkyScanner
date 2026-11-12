import { describe, expect, it } from 'vitest'
import { cloudLookup, cloudUrl, parseCloud } from './cloud'

describe('cloud forecast', () => {
  const json = { hourly: { time: ['2026-11-12T21:00', '2026-11-12T22:00'], cloud_cover: [20, 80] } }

  it('asks Open-Meteo for hourly cloud cover', () => {
    expect(cloudUrl(51.5, -0.12)).toContain('hourly=cloud_cover')
  })
  it('parses GMT hours and looks up the hour a time falls in', () => {
    const lookup = cloudLookup(parseCloud(json))
    expect(lookup(new Date(Date.UTC(2026, 10, 12, 21, 40)))).toBe(20)
    expect(lookup(new Date(Date.UTC(2026, 10, 12, 22, 5)))).toBe(80)
    expect(lookup(new Date(Date.UTC(2026, 10, 13, 5)))).toBeNull()
  })
  it('treats a bad response as no forecast', () => {
    expect(parseCloud(null)).toBeNull()
    expect(parseCloud({ hourly: { time: 'x' } })).toBeNull()
    expect(cloudLookup(null)(new Date())).toBeNull()
  })
})
