/**
 * Hourly weather from the Open-Meteo forecast API (free, no key): cloud,
 * humidity and dew point, wind and gusts, chance of rain, and the jet-stream
 * wind that makes planets shimmer. Every failure resolves to null, so the app
 * carries on without a forecast.
 */
import type { CloudLookup } from './score'

/** One hour of weather. Any field can be missing from the forecast. */
export type Hour = {
  cloud: number | null
  humidity: number | null
  /** Air temperature minus dew point, in °C: under about 2° lenses dew up. */
  dewSpread: number | null
  /** Wind and gusts at 10 m, km/h. */
  wind: number | null
  gusts: number | null
  /** Chance of rain, percent. */
  rain: number | null
  /** Wind at 250 hPa (jet-stream height), km/h: strong jet stream, unsteady air. */
  jet: number | null
}

export type WeatherForecast = { times: number[]; hours: Hour[] }
export type WeatherLookup = (time: Date) => Hour | null

const VARS = {
  cloud_cover: 'cloud',
  relative_humidity_2m: 'humidity',
  temperature_2m: 'temp',
  dew_point_2m: 'dew',
  wind_speed_10m: 'wind',
  wind_gusts_10m: 'gusts',
  precipitation_probability: 'rain',
  wind_speed_250hPa: 'jet',
} as const

export function weatherUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    hourly: Object.keys(VARS).join(','),
    wind_speed_unit: 'kmh',
    timezone: 'GMT',
    forecast_days: '7',
    past_days: '1',
  })
  return `https://api.open-meteo.com/v1/forecast?${p}`
}

/** Parse the API response. Returns null for anything that isn't the expected shape. */
export function parseWeather(json: unknown): WeatherForecast | null {
  const hourly = (json as { hourly?: Record<string, unknown> } | null)?.hourly
  if (!hourly || !Array.isArray(hourly.time) || !Array.isArray(hourly.cloud_cover)) return null
  const col = (key: keyof typeof VARS, i: number) => {
    const arr = hourly[key]
    const v = Array.isArray(arr) ? arr[i] : null
    return typeof v === 'number' ? v : null
  }
  const times: number[] = []
  const hours: Hour[] = []
  hourly.time.forEach((t, i) => {
    // Times are GMT without a zone suffix, e.g. "2026-11-12T21:00".
    const ms = typeof t === 'string' ? Date.parse(`${t}:00Z`) : NaN
    if (!Number.isFinite(ms)) return
    const temp = col('temperature_2m', i)
    const dew = col('dew_point_2m', i)
    times.push(ms)
    hours.push({
      cloud: col('cloud_cover', i),
      humidity: col('relative_humidity_2m', i),
      dewSpread: temp != null && dew != null ? temp - dew : null,
      wind: col('wind_speed_10m', i),
      gusts: col('wind_gusts_10m', i),
      rain: col('precipitation_probability', i),
      jet: col('wind_speed_250hPa', i),
    })
  })
  return times.length ? { times, hours } : null
}

/** The forecast hour a moment falls in, or null outside the forecast. */
export function weatherLookup(forecast: WeatherForecast | null): WeatherLookup {
  if (!forecast) return () => null
  const index = new Map(forecast.times.map((t, i) => [t, i]))
  return (time) => {
    const i = index.get(Math.floor(time.getTime() / 3_600_000) * 3_600_000)
    return i == null ? null : forecast.hours[i]
  }
}

/** Just the cloud cover, for the cloud factor and the chart's cloud strip. */
export function cloudLookup(weatherAt: WeatherLookup): CloudLookup {
  return (time) => weatherAt(time)?.cloud ?? null
}

export async function fetchWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherForecast | null> {
  try {
    const res = await fetch(weatherUrl(lat, lon), { signal })
    if (!res.ok) return null
    return parseWeather(await res.json())
  } catch {
    return null
  }
}

export type NightOutlook = {
  /** clear, mixed or cloudy; none when there's no forecast. */
  level: 'clear' | 'mixed' | 'cloudy' | 'none'
  headline: string
  details: string[]
}

/**
 * A one-line weather outlook for the dark hours of a night (Sun below -12°).
 * `when` is "tonight" or a date such as "on Thu 19 Nov".
 */
export function nightOutlook(
  samples: { time: Date; sunAlt: number }[],
  weatherAt: WeatherLookup,
  when: string,
  timeZone?: string,
): NightOutlook {
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone }).format(d)
  // One entry per forecast hour of darkness.
  const seen = new Set<number>()
  const hours: { time: Date; h: Hour }[] = []
  for (const s of samples) {
    if (s.sunAlt > -12) continue
    const hourMs = Math.floor(s.time.getTime() / 3_600_000) * 3_600_000
    if (seen.has(hourMs)) continue
    seen.add(hourMs)
    const h = weatherAt(s.time)
    if (h) hours.push({ time: new Date(hourMs), h })
  }
  const clouds = hours.filter((x) => x.h.cloud != null)
  if (!clouds.length) {
    return { level: 'none', headline: 'No weather forecast for this night', details: ['Check the sky before you set up.'] }
  }

  const mean = Math.round(clouds.reduce((a, x) => a + x.h.cloud!, 0) / clouds.length)
  const level = mean <= 25 ? 'clear' : mean <= 65 ? 'mixed' : 'cloudy'
  const headline =
    mean <= 25
      ? `Clear ${when}`
      : mean <= 50
        ? `Partly cloudy ${when}`
        : mean <= 80
          ? `Mostly cloudy ${when}`
          : `Overcast ${when}`

  // Longest run of hours at or under 30% cloud.
  let best: [number, number] | null = null
  let start = -1
  clouds.forEach((x, i) => {
    const clear = x.h.cloud! <= 30
    if (clear && start < 0) start = i
    if ((!clear || i === clouds.length - 1) && start >= 0) {
      const end = clear ? i : i - 1
      if (!best || end - start > best[1] - best[0]) best = [start, end]
      start = -1
    }
  })

  const details = [`${mean}% cloud on average`]
  const run = best as [number, number] | null
  if (run && !(run[0] === 0 && run[1] === clouds.length - 1)) {
    const to = new Date(clouds[run[1]].time.getTime() + 3_600_000)
    details.push(`clearest ${fmt(clouds[run[0]].time)}–${fmt(to)}`)
  } else if (!run) {
    details.push('no clear spells')
  }

  const max = (f: (h: Hour) => number | null) =>
    hours.reduce<number | null>((m, x) => {
      const v = f(x.h)
      return v == null ? m : m == null ? v : Math.max(m, v)
    }, null)
  const gust = max((h) => h.gusts ?? h.wind)
  const rain = max((h) => h.rain)
  const dew = max((h) => (h.dewSpread == null ? null : -h.dewSpread))
  const jet = max((h) => h.jet)
  if (gust != null) details.push(gust > 25 ? `gusts to ${Math.round(gust)} km/h` : 'light wind')
  if (rain != null && rain >= 30) details.push(`${Math.round(rain)}% chance of rain`)
  if (dew != null && -dew < 2.5) details.push('dew likely')
  if (jet != null && jet > 100) details.push('unsteady air for planets')
  return { level, headline, details }
}
