/** Plain-English text for the score breakdown. Pure, so it can be unit-tested. */
import type { Target } from './catalogue'
import type { Assessment, Factor, FactorId, Rating } from './score'
import { compass, crossings, formatTime, phaseName, type NightBase } from './sky'

export const FACTOR_LABEL: Record<FactorId, string> = {
  altitude: 'Altitude',
  darkness: 'Darkness',
  moon: 'Moon',
  cloud: 'Cloud',
  sky: 'Visibility',
  time: 'Time',
}

/** The Moon's own "moon" factor rates its phase, so it gets its own label. */
export function factorLabel(id: FactorId, target: Target): string {
  return id === 'moon' && target.kind === 'moon' ? 'Phase' : FACTOR_LABEL[id]
}

export const BORTLE_LABEL = [
  '',
  'excellent dark site',
  'truly dark site',
  'rural sky',
  'rural to suburban',
  'suburban',
  'bright suburban',
  'suburban to urban',
  'city',
  'inner city',
]

export function factorRating(value: number | null): Rating | 'No data' {
  if (value == null) return 'No data'
  if (value >= 0.85) return 'Great'
  if (value >= 0.65) return 'Good'
  if (value >= 0.4) return 'Fair'
  return 'Poor'
}

type Ctx = {
  night: NightBase
  target: Target
  a: Assessment
  bortle: number
  filterOn: boolean
  /** Name and kind of the equipment in use, for the visibility and time text. */
  kit?: { name: string; imaging: boolean }
  timeZone?: string
}

const FAINT_KINDS = new Set(['emission-nebula', 'reflection-nebula', 'planetary-nebula', 'supernova-remnant', 'galaxy', 'globular-cluster'])

function hoursText(h: number): string {
  const r = Math.round(h * 2) / 2
  if (r < 1) return `${Math.max(10, Math.round((h * 60) / 10) * 10)} minutes`
  return r === 1 ? 'about an hour' : `about ${r} hours`
}

export function explainFactor(f: Factor, ctx: Ctx): string {
  const { night, target, a, timeZone } = ctx
  const t = (d: Date) => formatTime(d, timeZone)
  const range = a.dark ? a.samples.slice(a.dark[0], a.dark[1] + 1) : []
  const win = a.window ? a.samples.slice(a.window[0], a.window[1] + 1) : []

  switch (f.id) {
    case 'altitude': {
      if (a.daytime && !a.peak) {
        const best = Math.max(...a.samples.map((s) => s.alt), -90)
        return best <= 0 ? 'Below the horizon all day from here.' : `Only reaches ${Math.round(best)}° today, too low to be worth it.`
      }
      if (!a.peak) {
        const best = Math.max(...range.map((s) => s.alt), -90)
        return best <= 0 ? 'Below the horizon all night from here.' : `Only reaches ${Math.round(best)}° in the dark, too low to be worth it.`
      }
      const low = a.peak.alt < 30 ? ' It never climbs much higher from here.' : ''
      return `Peaks at ${Math.round(a.peak.alt)}° at ${t(a.peak.time)}, in the ${compass(a.peak.az)}.${low}`
    }
    case 'darkness': {
      if (['planet', 'double-star', 'moon'].includes(target.kind)) return 'Bright enough to enjoy in twilight.'
      const astro = crossings(range, (s) => s.sunAlt, -18)
      const start = astro.find((c) => !c.rising)
      const end = astro.find((c) => c.rising)
      if (!start || !end) return 'No full darkness tonight. The sky stays in twilight.'
      return `Fully dark from ${t(start.time)} to ${t(end.time)}.`
    }
    case 'moon': {
      if (target.kind === 'moon') {
        const pct = Math.round(night.moonIllum * 100)
        const name = phaseName(night.moonPhase)
        if (night.moonIllum < 0.03) return `${name}: too close to the Sun to see tonight.`
        if (night.moonIllum > 0.9)
          return `${name}, ${pct}% lit. Bright and flat-looking: craters show best near the edge of the shadow.`
        return `${name}, ${pct}% lit. Craters stand out in relief along the shadow line.`
      }
      const pct = Math.round(night.moonIllum * 100)
      const events = crossings(range, (s) => s.moonAlt, 0)
        .map((c) => `${c.rising ? 'rises' : 'sets'} at ${t(c.time)}`)
        .join(', ')
      const upInWindow = win.filter((s) => s.moonAlt > 0)
      let where: string
      if (!win.length) where = ''
      else if (!upInWindow.length) where = ' Below the horizon during your window.'
      else {
        const sep = Math.round(upInWindow.reduce((sum, s) => sum + s.moonSep, 0) / upInWindow.length)
        where = ` Up during your window, ${sep}° away.`
      }
      return `${pct}% lit${events ? `, ${events}` : ''}.${where}`
    }
    case 'cloud':
      if (a.cloudInWindow == null) return 'No forecast available. Check the sky before you set up.'
      return `${Math.round(a.cloudInWindow)}% cloud on average in your window.`
    case 'sky': {
      const filter = ctx.filterOn ? ' The filter helps cut through it.' : ''
      const sky = `Bortle ${ctx.bortle}, ${BORTLE_LABEL[ctx.bortle] ?? ''}.`
      if (!FAINT_KINDS.has(target.kind) || f.value == null) return `${sky}${filter}`
      const kit = ctx.kit ? `your ${ctx.kit.name}` : 'your kit'
      const v = f.value
      const how =
        v >= 0.85
          ? `Stands out well with ${kit}.`
          : v >= 0.6
            ? `Shows clearly with ${kit}, a little washed out.`
            : v >= 0.35
              ? `Faint against this sky with ${kit}. A darker site would help a lot.`
              : `Very hard to pick out of this sky with ${kit}.`
      return `${sky} ${how}${filter}`
    }
    case 'time': {
      if (!a.window) return 'Not well placed at all.'
      const well = `Well placed for ${hoursText(a.usableHours)}.`
      if ((f.value ?? 0) >= 0.99) return well
      const imaging = ctx.kit?.imaging ?? true
      const want = ['double-star', 'planet', 'moon', 'sun'].includes(target.kind)
        ? 'half an hour'
        : imaging
          ? 'a couple of hours of imaging'
          : 'an hour at the eyepiece'
      return `${well} It deserves ${want}.`
    }
  }
}
