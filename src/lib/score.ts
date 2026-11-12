/**
 * Suitability score and best window for one target on one night.
 *
 * Every 10-minute sample gets a quality from 0 to 1 (altitude × darkness ×
 * moonlight × cloud). The best window is the stretch around the best sample
 * where quality stays within 85% of it. The score is a weighted geometric
 * mean of five factors averaged over that window, so one very bad factor
 * (thick cloud, below the horizon) pulls the whole score down.
 */
import { isDaytime, NARROWBAND_KINDS, type Target, type TargetKind } from './catalogue'
import { darkRange, type NightBase, type TargetSample, trackTarget } from './sky'

export type SkySettings = {
  /** Bortle class, 1 (darkest) to 9 (inner city). */
  bortle: number
  /** True when a light-pollution, duo-band, UHC or OIII filter is in use. */
  narrowbandFilter: boolean
}

/** Cloud cover in percent for a time, or null if there's no forecast for it. */
export type CloudLookup = (time: Date) => number | null

export type FactorId = 'altitude' | 'darkness' | 'moon' | 'cloud' | 'sky'

export type Factor = {
  id: FactorId
  /** 0 (bad) to 1 (perfect). Null when there's no data, e.g. no cloud forecast. */
  value: number | null
}

export type Rating = 'Great' | 'Good' | 'Fair' | 'Poor'

export type Assessment = {
  samples: TargetSample[]
  /** Indices into samples where the Sun is down, or null for no darkness. */
  dark: [number, number] | null
  quality: number[]
  /** Indices [from, to] into samples, or null when the target isn't worth it tonight. */
  window: [number, number] | null
  peak: TargetSample | null
  factors: Factor[]
  score: number
  rating: Rating
  /** Mean cloud cover in the window, if known. */
  cloudInWindow: number | null
  /** True for the Sun: the window is in daylight, not darkness. */
  daytime: boolean
}

const WEIGHTS: Record<FactorId, number> = { altitude: 0.3, darkness: 0.1, moon: 0.15, cloud: 0.25, sky: 0.2 }

/** How much moonlight hurts each kind of target (0 = not at all, 1 = fully). */
const MOON_SENSITIVITY: Record<TargetKind, number> = {
  'emission-nebula': 0.9,
  'reflection-nebula': 1,
  'planetary-nebula': 0.7,
  'supernova-remnant': 0.9,
  galaxy: 1,
  'open-cluster': 0.5,
  'globular-cluster': 0.7,
  'double-star': 0.15,
  planet: 0.1,
  moon: 0,
  sun: 0,
}

/** How much a bright sky hurts each kind of target. */
const SKY_SENSITIVITY: Record<TargetKind, number> = {
  'emission-nebula': 0.8,
  'reflection-nebula': 1,
  'planetary-nebula': 0.6,
  'supernova-remnant': 0.8,
  galaxy: 1,
  'open-cluster': 0.4,
  'globular-cluster': 0.6,
  'double-star': 0.1,
  planet: 0.05,
  moon: 0,
  sun: 0,
}

/** Bright targets only need nautical twilight; faint ones need full darkness. */
const NEEDS_FULL_DARK = (kind: TargetKind) => !['double-star', 'planet', 'moon', 'sun'].includes(kind)

/**
 * For the Moon itself, the "moon" factor rates the phase instead of moonlight.
 * Craters stand out best along the shadow line, so quarters and crescents beat
 * a flat, glaring full Moon, and a new Moon can't be seen at all.
 */
export function phaseFactor(illum: number): number {
  if (illum < 0.03) return 0.05
  if (illum < 0.1) return 0.5 + (0.5 * (illum - 0.03)) / 0.07
  if (illum <= 0.75) return 1
  return 1 - (0.4 * (illum - 0.75)) / 0.25
}

/** The Sun is worth a look from a lower altitude than faint targets. */
export function sunAltitudeFactor(alt: number): number {
  if (alt <= 5) return 0
  if (alt >= 35) return 1
  return Math.sqrt((alt - 5) / 30)
}

export function altitudeFactor(alt: number): number {
  if (alt <= 10) return 0
  if (alt >= 50) return 1
  return Math.sqrt((alt - 10) / 40)
}

export function darknessFactor(sunAlt: number, kind: TargetKind): number {
  if (!NEEDS_FULL_DARK(kind)) return sunAlt <= -6 ? 1 : sunAlt <= 0 ? 0.3 : 0
  if (sunAlt <= -18) return 1
  if (sunAlt <= -12) return 0.7 + (0.3 * (-12 - sunAlt)) / 6
  if (sunAlt <= -6) return 0.3 + (0.4 * (-6 - sunAlt)) / 6
  return 0
}

export function moonFactor(moonAlt: number, moonSep: number, illum: number, kind: TargetKind): number {
  if (moonAlt <= 0) return 1
  const proximity = 0.4 + 0.6 * clamp((90 - moonSep) / 75, 0, 1)
  return 1 - 0.9 * illum * MOON_SENSITIVITY[kind] * proximity
}

export function skyFactor(sky: SkySettings, kind: TargetKind): number {
  let penalty = ((clamp(sky.bortle, 1, 9) - 1) / 8) * SKY_SENSITIVITY[kind]
  if (sky.narrowbandFilter && NARROWBAND_KINDS.has(kind)) penalty *= 0.5
  return 1 - 0.85 * penalty
}

export function cloudFactor(cloud: number | null): number | null {
  return cloud == null ? null : 1 - clamp(cloud, 0, 100) / 100
}

export function rate(score: number): Rating {
  if (score >= 80) return 'Great'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

export function assess(
  night: NightBase,
  target: Target,
  sky: SkySettings,
  cloudAt: CloudLookup = () => null,
): Assessment {
  const samples = trackTarget(night, target)
  const dark = darkRange(samples)
  const kind = target.kind
  const daytime = isDaytime(kind)
  const moonF = (s: TargetSample) =>
    kind === 'moon' ? phaseFactor(night.moonIllum) : moonFactor(s.moonAlt, s.moonSep, night.moonIllum, kind)

  const quality = samples.map((s, i) => {
    const c = cloudFactor(cloudAt(s.time)) ?? 1
    if (daytime) return sunAltitudeFactor(s.alt) * c
    if (!dark || i < dark[0] || i > dark[1]) return 0
    return altitudeFactor(s.alt) * darknessFactor(s.sunAlt, kind) * moonF(s) * c
  })

  let best = 0
  quality.forEach((q, i) => {
    if (q > quality[best]) best = i
  })

  const skyF = skyFactor(sky, kind)
  if (quality[best] <= 0) {
    return {
      samples,
      dark,
      quality,
      window: null,
      peak: null,
      factors: daytime
        ? [
            { id: 'altitude', value: 0 },
            { id: 'cloud', value: null },
          ]
        : [
            { id: 'altitude', value: 0 },
            { id: 'darkness', value: dark ? 1 : 0 },
            { id: 'moon', value: kind === 'moon' ? phaseFactor(night.moonIllum) : null },
            { id: 'cloud', value: null },
            ...(kind === 'moon' ? [] : [{ id: 'sky' as const, value: skyF }]),
          ],
      score: 0,
      rating: 'Poor',
      cloudInWindow: null,
      daytime,
    }
  }

  const floor = quality[best] * 0.85
  let from = best
  let to = best
  while (from > 0 && quality[from - 1] >= floor) from--
  while (to < quality.length - 1 && quality[to + 1] >= floor) to++

  const inWindow = samples.slice(from, to + 1)
  const mean = (f: (s: TargetSample) => number) => inWindow.reduce((sum, s) => sum + f(s), 0) / inWindow.length
  const clouds = inWindow.map((s) => cloudAt(s.time)).filter((c): c is number => c != null)
  const cloudInWindow = clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : null

  const factors: Factor[] = daytime
    ? [
        { id: 'altitude', value: mean((s) => sunAltitudeFactor(s.alt)) },
        { id: 'cloud', value: cloudFactor(cloudInWindow) },
      ]
    : [
        { id: 'altitude', value: mean((s) => altitudeFactor(s.alt)) },
        { id: 'darkness', value: mean((s) => darknessFactor(s.sunAlt, kind)) },
        { id: 'moon', value: mean(moonF) },
        { id: 'cloud', value: cloudFactor(cloudInWindow) },
        // The Moon outshines any light pollution, so sky brightness doesn't count for it.
        ...(kind === 'moon' ? [] : [{ id: 'sky' as const, value: skyF }]),
      ]

  const peak = inWindow.reduce((a, b) => (b.alt > a.alt ? b : a))
  const score = combine(factors)
  return {
    samples,
    dark,
    quality,
    window: [from, to],
    peak,
    factors,
    score,
    rating: rate(score),
    cloudInWindow,
    daytime,
  }
}

/** Weighted geometric mean, ignoring factors with no data. Returns 0 to 100. */
export function combine(factors: Factor[]): number {
  let weight = 0
  let logSum = 0
  for (const f of factors) {
    if (f.value == null) continue
    const w = WEIGHTS[f.id]
    if (f.value <= 0) return 0
    weight += w
    logSum += w * Math.log(f.value)
  }
  return weight ? Math.round(100 * Math.exp(logSum / weight)) : 0
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x))
}
