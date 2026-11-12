/**
 * Finding the observer's location. Every helper resolves to null on failure,
 * so the user can always fall back to typing coordinates.
 *
 * - Device geolocation (browser API)
 * - IP fallback: get.geojs.io
 * - Place name for coordinates: BigDataCloud reverse-geocode-client
 * - Town search: Open-Meteo geocoding API
 */
import type { Place } from './sky'

export type PlaceSource = 'device' | 'ip' | 'search' | 'manual' | 'default'

export type SavedPlace = Place & { source?: PlaceSource }

export function validCoords(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`
}

/* Town search */

export type TownResult = Place & { detail: string }

export function townSearchUrl(query: string): string {
  const p = new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' })
  return `https://geocoding-api.open-meteo.com/v1/search?${p}`
}

export function parseTownSearch(json: unknown): TownResult[] {
  const results = (json as { results?: unknown } | null)?.results
  if (!Array.isArray(results)) return []
  return results.flatMap((r) => {
    const { name, latitude, longitude, admin1, country } = (r ?? {}) as Record<string, unknown>
    if (typeof name !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') return []
    if (!validCoords(latitude, longitude)) return []
    const detail = [admin1, country].filter((x): x is string => typeof x === 'string' && x.length > 0).join(', ')
    return [{ name, lat: latitude, lon: longitude, detail }]
  })
}

export async function searchTowns(query: string, signal?: AbortSignal): Promise<TownResult[] | null> {
  if (query.trim().length < 2) return []
  try {
    const res = await fetch(townSearchUrl(query.trim()), { signal })
    if (!res.ok) return null
    return parseTownSearch(await res.json())
  } catch {
    return null
  }
}

/* Reverse geocode */

export function reverseGeocodeUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({ latitude: String(lat), longitude: String(lon), localityLanguage: 'en' })
  return `https://api.bigdatacloud.net/data/reverse-geocode-client?${p}`
}

export function parseReverseGeocode(json: unknown): string | null {
  const r = (json ?? {}) as Record<string, unknown>
  for (const key of ['city', 'locality', 'principalSubdivision', 'countryName']) {
    const v = r[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export async function placeName(lat: number, lon: number, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(reverseGeocodeUrl(lat, lon), { signal })
    if (!res.ok) return null
    return parseReverseGeocode(await res.json())
  } catch {
    return null
  }
}

/* IP fallback */

export const IP_URL = 'https://get.geojs.io/v1/ip/geo.json'

export function parseIpLocation(json: unknown): Place | null {
  const r = (json ?? {}) as Record<string, unknown>
  const lat = Number(r.latitude)
  const lon = Number(r.longitude)
  if (r.latitude == null || r.longitude == null || !validCoords(lat, lon)) return null
  const name = [r.city, r.region, r.country].find((x): x is string => typeof x === 'string' && x.trim().length > 0)
  return { lat, lon, name: name ?? formatCoords(lat, lon) }
}

export async function ipLocation(signal?: AbortSignal): Promise<Place | null> {
  try {
    const res = await fetch(IP_URL, { signal })
    if (!res.ok) return null
    return parseIpLocation(await res.json())
  } catch {
    return null
  }
}

/* Device location */

export function deviceLocation(timeoutMs = 15_000): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
    if (!geo) return resolve(null)
    try {
      geo.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60_000 },
      )
    } catch {
      resolve(null)
    }
  })
}

/**
 * Best available location: the device first, then the IP address.
 * The place name comes from a reverse geocode, or the coordinates if that fails.
 */
export async function locate(signal?: AbortSignal): Promise<SavedPlace | null> {
  const device = await deviceLocation()
  if (device) {
    const name = await placeName(device.lat, device.lon, signal)
    return { ...device, name: name ?? formatCoords(device.lat, device.lon), source: 'device' }
  }
  const ip = await ipLocation(signal)
  return ip ? { ...ip, source: 'ip' } : null
}
