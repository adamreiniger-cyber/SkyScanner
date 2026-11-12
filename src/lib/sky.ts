/**
 * Sky positions through one night, from astronomy-engine.
 *
 * A "night" is sampled every 10 minutes from local noon to the next local noon,
 * so it always contains one whole stretch of darkness. The Sun and Moon are
 * worked out once per night and shared by every target.
 */
import { Body, Equator, Horizon, Illumination, MoonPhase, Observer } from 'astronomy-engine'
import type { Target } from './catalogue'

export type Place = { lat: number; lon: number; name: string }

export type BaseSample = {
  time: Date
  sunAlt: number
  moonAlt: number
  /** Moon's apparent position, used for its distance from each target. */
  moonRa: number
  moonDec: number
}

export type NightBase = {
  place: Place
  samples: BaseSample[]
  /** Fraction of the Moon's disc that is lit, 0 to 1, at local midnight. */
  moonIllum: number
  /** Moon's phase angle at local midnight: 0 new, 90 first quarter, 180 full, 270 last quarter. */
  moonPhase: number
}

export type TargetSample = BaseSample & {
  alt: number
  az: number
  /** Angle between the Moon and the target, in degrees. */
  moonSep: number
}

export const STEP_MINUTES = 10

/**
 * The local noon that starts the night to plan for.
 * In the small hours (before 06:00) you're still observing last night, so step
 * back a day. From 06:00 on, plan for the coming night.
 */
export function nightStart(now: Date): Date {
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  if (now.getHours() < 6) start.setDate(start.getDate() - 1)
  return start
}

export function computeNight(place: Place, now: Date): NightBase {
  const observer = new Observer(place.lat, place.lon, 0)
  const start = nightStart(now).getTime()
  const count = (24 * 60) / STEP_MINUTES
  const samples: BaseSample[] = []
  for (let i = 0; i <= count; i++) {
    const time = new Date(start + i * STEP_MINUTES * 60_000)
    const sun = Equator(Body.Sun, time, observer, true, true)
    const moon = Equator(Body.Moon, time, observer, true, true)
    samples.push({
      time,
      sunAlt: Horizon(time, observer, sun.ra, sun.dec, 'normal').altitude,
      moonAlt: Horizon(time, observer, moon.ra, moon.dec, 'normal').altitude,
      moonRa: moon.ra,
      moonDec: moon.dec,
    })
  }
  const midnight = new Date(start + 12 * 3_600_000)
  return {
    place,
    samples,
    moonIllum: Illumination(Body.Moon, midnight).phase_fraction,
    moonPhase: MoonPhase(midnight),
  }
}

/** Track a target across the night. Catalogue RA/Dec are J2000, which is close enough for planning. */
export function trackTarget(night: NightBase, target: Target): TargetSample[] {
  const observer = new Observer(night.place.lat, night.place.lon, 0)
  return night.samples.map((s) => {
    let ra: number
    let dec: number
    if (target.body) {
      const eq = Equator(Body[target.body], s.time, observer, true, true)
      ra = eq.ra
      dec = eq.dec
    } else {
      ra = target.ra!
      dec = target.dec!
    }
    const hor = Horizon(s.time, observer, ra, dec, 'normal')
    return { ...s, alt: hor.altitude, az: hor.azimuth, moonSep: separation(ra, dec, s.moonRa, s.moonDec) }
  })
}

/** Angular distance in degrees between two RA (hours) / Dec (degrees) positions. */
export function separation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const r = Math.PI / 180
  const a = ra1 * 15 * r
  const b = ra2 * 15 * r
  const cos =
    Math.sin(dec1 * r) * Math.sin(dec2 * r) + Math.cos(dec1 * r) * Math.cos(dec2 * r) * Math.cos(a - b)
  return Math.acos(Math.min(1, Math.max(-1, cos))) / r
}

/** Index range [from, to] of the samples where the Sun is below the horizon around midnight. */
export function darkRange(samples: BaseSample[]): [number, number] | null {
  let darkest = 0
  samples.forEach((s, i) => {
    if (s.sunAlt < samples[darkest].sunAlt) darkest = i
  })
  if (samples[darkest].sunAlt >= 0) return null
  let from = darkest
  let to = darkest
  while (from > 0 && samples[from - 1].sunAlt < 0) from--
  while (to < samples.length - 1 && samples[to + 1].sunAlt < 0) to++
  return [from, to]
}

/** Every time `pick` crosses `level`, interpolated between samples. */
export function crossings<S extends BaseSample>(
  samples: S[],
  pick: (s: S) => number,
  level: number,
): { time: Date; rising: boolean }[] {
  const out: { time: Date; rising: boolean }[] = []
  for (let i = 1; i < samples.length; i++) {
    const a = pick(samples[i - 1]) - level
    const b = pick(samples[i]) - level
    if ((a < 0) !== (b < 0)) {
      const f = a / (a - b)
      const t0 = samples[i - 1].time.getTime()
      const t1 = samples[i].time.getTime()
      out.push({ time: new Date(t0 + f * (t1 - t0)), rising: b > a })
    }
  }
  return out
}

/** Everyday name for a Moon phase angle in degrees. */
export function phaseName(deg: number): string {
  const d = ((deg % 360) + 360) % 360
  if (d < 10 || d >= 350) return 'New Moon'
  if (d < 80) return 'Waxing crescent'
  if (d < 100) return 'First quarter'
  if (d < 170) return 'Waxing gibbous'
  if (d < 190) return 'Full Moon'
  if (d < 260) return 'Waning gibbous'
  if (d < 280) return 'Last quarter'
  return 'Waning crescent'
}

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']

export function compass(az: number): string {
  return COMPASS[Math.round((((az % 360) + 360) % 360) / 45) % 8]
}

export function formatTime(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(d)
}
