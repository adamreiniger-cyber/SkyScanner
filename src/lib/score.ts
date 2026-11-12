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
import { darkRange, type NightBase, STEP_MINUTES, type TargetSample, trackTarget } from './sky'
import type { Hour, WeatherLookup } from './weather'

export type SkySettings = {
  /** Bortle class, 1 (darkest) to 9 (inner city). */
  bortle: number
  /** True when a light-pollution, duo-band, UHC or OIII filter is in use. */
  narrowbandFilter: boolean
  /** The equipment in use. Without it, a 50 mm smart telescope is assumed. */
  kit?: { apertureMm: number; imaging: boolean }
  /** Only look for the best window within this time range (one chosen hour). Night targets only. */
  only?: { from: Date; to: Date }
}

/** Cloud cover in percent for a time, or null if there's no forecast for it. */
export type CloudLookup = (time: Date) => number | null

export type FactorId = 'altitude' | 'darkness' | 'moon' | 'cloud' | 'conditions' | 'sky' | 'time'

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
  /** Hours the target stays at least half as good as its best. */
  usableHours: number
  /** True for the Sun: the window is in daylight, not darkness. */
  daytime: boolean
}

const WEIGHTS: Record<FactorId, number> = {
  altitude: 0.25,
  darkness: 0.1,
  moon: 0.25,
  cloud: 0.25,
  conditions: 0.15,
  sky: 0.35,
  time: 0.15,
}

/** Sky brightness overhead for each Bortle class, in magnitudes per square arcsecond. */
const BORTLE_SQM = [21.9, 21.9, 21.7, 21.4, 20.9, 20.2, 19.5, 18.9, 18.4, 18.0]

/** Faintest star visible to the naked eye for each Bortle class. */
const BORTLE_NELM = [7.8, 7.8, 7.3, 6.8, 6.3, 5.8, 5.5, 5.0, 4.5, 4.0]

/** Kinds judged on surface brightness: faint glows that light pollution drowns. */
const EXTENDED_KINDS: ReadonlySet<TargetKind> = new Set([
  'emission-nebula',
  'reflection-nebula',
  'planetary-nebula',
  'supernova-remnant',
  'galaxy',
  'globular-cluster',
])

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

/** Average surface brightness in magnitudes per square arcsecond, from magnitude and size. */
export function surfaceBrightness(magnitude: number, size: [number, number]): number {
  const areaArcmin = (Math.PI / 4) * size[0] * size[1]
  return magnitude + 2.5 * Math.log10(areaArcmin * 3600)
}

/**
 * How easily this kit shows this target under this sky, 0 to 1.
 *
 * Faint glows (nebulae, galaxies, globulars) compare their surface brightness
 * with the sky's. Stacking smart telescopes and bigger apertures dig deeper, and
 * a narrowband filter helps emission nebulae. Everything else (clusters of
 * bright stars, doubles, planets) only feels the sky a little.
 */
export function skyFactor(sky: SkySettings, target: Pick<Target, 'kind' | 'magnitude' | 'size'>): number {
  const { kind } = target
  const filter = sky.narrowbandFilter && NARROWBAND_KINDS.has(kind)
  if (!EXTENDED_KINDS.has(kind) || target.magnitude == null || !target.size) {
    let penalty = ((clamp(sky.bortle, 1, 9) - 1) / 8) * SKY_SENSITIVITY[kind]
    if (filter) penalty *= 0.5
    return 1 - 0.85 * penalty
  }
  const kit = sky.kit ?? { apertureMm: 50, imaging: true }
  const bortle = clamp(Math.round(sky.bortle), 1, 9)
  const logistic = (x: number) => 1 / (1 + Math.exp(-x / 0.8))
  // How the target's glow compares with the sky's, plus what the kit adds.
  const contrast = BORTLE_SQM[bortle] - surfaceBrightness(target.magnitude, target.size)
  const reach = kit.imaging ? 1.5 + 2.5 * Math.log10(kit.apertureMm / 30) : 1 + 2 * Math.log10(kit.apertureMm / 50)
  const glow = logistic(contrast + reach + (filter ? 1.5 : 0) + 1)
  if (kit.imaging) return glow
  // At the eyepiece the whole object also has to be well above the faintest star you can see.
  const limit = BORTLE_NELM[bortle] + 5 * Math.log10(kit.apertureMm / 7)
  return glow * logistic(limit - target.magnitude - 2)
}

/** Targets viewed at high magnification, where unsteady air (poor seeing) blurs detail. */
const HIGH_POWER: ReadonlySet<TargetKind> = new Set(['planet', 'moon', 'double-star', 'sun'])

/**
 * Everything about the weather except cloud: chance of rain, dew, wind shake
 * and, for planets and doubles, how steady the air is. 1 is perfect; null when
 * there's no forecast for the hour.
 */
export function conditionsFactor(h: Hour | null, kind: TargetKind, imaging: boolean): number | null {
  if (!h) return null
  let f = 1
  if (h.rain != null) f *= 1 - 0.8 * clamp(h.rain / 100, 0, 1)
  if (h.dewSpread != null && kind !== 'sun') f *= h.dewSpread < 1 ? 0.7 : h.dewSpread < 2.5 ? 0.85 : 1
  const gust = h.gusts ?? h.wind
  if (gust != null) {
    const bands = imaging ? [40, 0.45, 25, 0.7, 15, 0.9] : [50, 0.6, 35, 0.8, 25, 0.95]
    f *= gust > bands[0] ? bands[1] : gust > bands[2] ? bands[3] : gust > bands[4] ? bands[5] : 1
  }
  if (h.jet != null && HIGH_POWER.has(kind)) f *= h.jet > 150 ? 0.55 : h.jet > 100 ? 0.75 : h.jet > 60 ? 0.9 : 1
  return f
}

/** Hours worth spending: imaging faint targets wants a couple of hours, bright ones far less. */
export function hoursNeeded(kind: TargetKind, imaging: boolean): number {
  if (kind === 'double-star' || kind === 'planet' || kind === 'moon' || kind === 'sun') return 0.5
  return imaging ? 2 : 1
}

/** 1 when the target is well placed for as long as it needs, falling off when time is short. */
export function timeFactor(hours: number, needed: number): number {
  return Math.sqrt(clamp(hours / needed, 0, 1))
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
  weatherAt: WeatherLookup = () => null,
): Assessment {
  const samples = trackTarget(night, target)
  const dark = darkRange(samples)
  const kind = target.kind
  const daytime = isDaytime(kind)
  const moonF = (s: TargetSample) =>
    kind === 'moon' ? phaseFactor(night.moonIllum) : moonFactor(s.moonAlt, s.moonSep, night.moonIllum, kind)

  const imagingKit = sky.kit?.imaging ?? true
  const quality = samples.map((s, i) => {
    const c = (cloudFactor(cloudAt(s.time)) ?? 1) * (conditionsFactor(weatherAt(s.time), kind, imagingKit) ?? 1)
    if (daytime) return sunAltitudeFactor(s.alt) * c
    if (!dark || i < dark[0] || i > dark[1]) return 0
    return altitudeFactor(s.alt) * darknessFactor(s.sunAlt, kind) * moonF(s) * c
  })

  // With one hour chosen, the window must fall inside it. Usable hours still
  // count the whole night, so the Time factor means the same either way.
  const only = daytime ? undefined : sky.only
  const pick = only
    ? quality.map((q, i) => {
        const t = samples[i].time.getTime()
        return t >= only.from.getTime() && t <= only.to.getTime() ? q : 0
      })
    : quality

  let best = 0
  pick.forEach((q, i) => {
    if (q > pick[best]) best = i
  })

  const skyF = skyFactor(sky, target)
  const imaging = sky.kit?.imaging ?? true
  const nightBest = Math.max(...quality)
  const usableHours = (quality.filter((q) => q > 0 && q >= nightBest * 0.5).length * STEP_MINUTES) / 60
  if (pick[best] <= 0) {
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
            { id: 'conditions', value: null },
          ]
        : [
            { id: 'altitude', value: 0 },
            { id: 'darkness', value: dark ? 1 : 0 },
            { id: 'moon', value: kind === 'moon' ? phaseFactor(night.moonIllum) : null },
            { id: 'cloud', value: null },
            { id: 'conditions', value: null },
            ...(kind === 'moon' ? [] : [{ id: 'sky' as const, value: skyF }]),
          ],
      score: 0,
      rating: 'Poor',
      cloudInWindow: null,
      usableHours: 0,
      daytime,
    }
  }

  const floor = pick[best] * 0.85
  let from = best
  let to = best
  while (from > 0 && pick[from - 1] >= floor) from--
  while (to < pick.length - 1 && pick[to + 1] >= floor) to++

  const inWindow = samples.slice(from, to + 1)
  const mean = (f: (s: TargetSample) => number) => inWindow.reduce((sum, s) => sum + f(s), 0) / inWindow.length
  const clouds = inWindow.map((s) => cloudAt(s.time)).filter((c): c is number => c != null)
  const cloudInWindow = clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : null
  const conds = inWindow
    .map((s) => conditionsFactor(weatherAt(s.time), kind, imagingKit))
    .filter((c): c is number => c != null)
  const conditions = conds.length ? conds.reduce((a, b) => a + b, 0) / conds.length : null

  const factors: Factor[] = daytime
    ? [
        { id: 'altitude', value: mean((s) => sunAltitudeFactor(s.alt)) },
        { id: 'cloud', value: cloudFactor(cloudInWindow) },
        { id: 'conditions', value: conditions },
        { id: 'time', value: timeFactor(usableHours, hoursNeeded(kind, imaging)) },
      ]
    : [
        { id: 'altitude', value: mean((s) => altitudeFactor(s.alt)) },
        { id: 'darkness', value: mean((s) => darknessFactor(s.sunAlt, kind)) },
        { id: 'moon', value: mean(moonF) },
        { id: 'cloud', value: cloudFactor(cloudInWindow) },
        { id: 'conditions', value: conditions },
        // The Moon outshines any light pollution, so sky brightness doesn't count for it.
        ...(kind === 'moon' ? [] : [{ id: 'sky' as const, value: skyF }]),
        { id: 'time', value: timeFactor(usableHours, hoursNeeded(kind, imaging)) },
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
    usableHours,
    daytime,
  }
}

/**
 * Weighted geometric mean, ignoring factors with no data, capped by the
 * weakest factor: a target is only as good as its worst problem, so one very
 * poor factor can't be averaged away by good ones. Returns 0 to 100.
 */
export function combine(factors: Factor[]): number {
  let weight = 0
  let logSum = 0
  let weakest = 1
  for (const f of factors) {
    if (f.value == null) continue
    const w = WEIGHTS[f.id]
    if (f.value <= 0) return 0
    weight += w
    logSum += w * Math.log(f.value)
    weakest = Math.min(weakest, f.value)
  }
  if (!weight) return 0
  return Math.round(100 * Math.min(Math.exp(logSum / weight), weakest ** 0.6))
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x))
}
