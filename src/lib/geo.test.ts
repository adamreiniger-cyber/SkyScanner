import { describe, expect, it } from 'vitest'
import { formatCoords, parseIpLocation, parseReverseGeocode, parseTownSearch, townSearchUrl, validCoords } from './geo'

describe('geo helpers', () => {
  it('validates and formats coordinates', () => {
    expect(validCoords(51.5, -0.1)).toBe(true)
    expect(validCoords(91, 0)).toBe(false)
    expect(validCoords(0, -181)).toBe(false)
    expect(formatCoords(51.5074, -0.1278)).toBe('51.51° N, 0.13° W')
    expect(formatCoords(-33.87, 151.21)).toBe('33.87° S, 151.21° E')
  })

  it('parses Open-Meteo town search results and skips bad rows', () => {
    expect(townSearchUrl('York')).toContain('name=York')
    const json = {
      results: [
        { name: 'York', latitude: 53.96, longitude: -1.08, admin1: 'England', country: 'United Kingdom' },
        { name: 'Broken', latitude: 'x', longitude: 0 },
      ],
    }
    expect(parseTownSearch(json)).toEqual([{ name: 'York', lat: 53.96, lon: -1.08, detail: 'England, United Kingdom' }])
    expect(parseTownSearch({})).toEqual([])
    expect(parseTownSearch(null)).toEqual([])
  })

  it('names a place from a reverse geocode, falling back through the fields', () => {
    expect(parseReverseGeocode({ city: 'Bristol', locality: 'Clifton' })).toBe('Bristol')
    expect(parseReverseGeocode({ city: '', locality: 'Clifton' })).toBe('Clifton')
    expect(parseReverseGeocode({})).toBeNull()
  })

  it('reads the IP fallback, which sends coordinates as strings', () => {
    expect(parseIpLocation({ latitude: '52.2', longitude: '0.12', city: 'Cambridge' })).toEqual({
      lat: 52.2,
      lon: 0.12,
      name: 'Cambridge',
    })
    expect(parseIpLocation({ latitude: '52.2' })).toBeNull()
  })
})
