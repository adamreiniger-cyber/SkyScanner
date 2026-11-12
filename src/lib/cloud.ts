/**
 * Hourly cloud cover from the Open-Meteo forecast API (free, no key).
 * Every failure resolves to null, so the app carries on without a forecast.
 */
import type { CloudLookup } from './score'

export type CloudForecast = { times: number[]; cover: number[] }

export function cloudUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    hourly: 'cloud_cover',
    timezone: 'GMT',
    forecast_days: '3',
    past_days: '1',
  })
  return `https://api.open-meteo.com/v1/forecast?${p}`
}

/** Parse the API response. Returns null for anything that isn't the expected shape. */
export function parseCloud(json: unknown): CloudForecast | null {
  const hourly = (json as { hourly?: { time?: unknown; cloud_cover?: unknown } } | null)?.hourly
  if (!hourly || !Array.isArray(hourly.time) || !Array.isArray(hourly.cloud_cover)) return null
  const times: number[] = []
  const cover: number[] = []
  hourly.time.forEach((t, i) => {
    const c = (hourly.cloud_cover as unknown[])[i]
    // Times are GMT without a zone suffix, e.g. "2026-11-12T21:00".
    const ms = typeof t === 'string' ? Date.parse(`${t}:00Z`) : NaN
    if (Number.isFinite(ms) && typeof c === 'number') {
      times.push(ms)
      cover.push(c)
    }
  })
  return times.length ? { times, cover } : null
}

/** Cloud cover at a moment: the hourly value for the hour it falls in, or null outside the forecast. */
export function cloudLookup(forecast: CloudForecast | null): CloudLookup {
  if (!forecast) return () => null
  return (time) => {
    const hour = Math.floor(time.getTime() / 3_600_000) * 3_600_000
    const i = forecast.times.indexOf(hour)
    return i < 0 ? null : forecast.cover[i]
  }
}

export async function fetchCloud(lat: number, lon: number, signal?: AbortSignal): Promise<CloudForecast | null> {
  try {
    const res = await fetch(cloudUrl(lat, lon), { signal })
    if (!res.ok) return null
    return parseCloud(await res.json())
  } catch {
    return null
  }
}
