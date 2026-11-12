/** Plain-English text for the score breakdown. Pure, so it can be unit-tested. */
import type { Target } from './catalogue'
import type { Assessment, Factor, FactorId, Rating } from './score'
import { compass, crossings, formatTime, type NightBase } from './sky'

export const FACTOR_LABEL: Record<FactorId, string> = {
  altitude: 'Altitude',
  darkness: 'Darkness',
  moon: 'Moon',
  cloud: 'Cloud',
  sky: 'Sky brightness',
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

type Ctx = { night: NightBase; target: Target; a: Assessment; bortle: number; filterOn: boolean; timeZone?: string }

export function explainFactor(f: Factor, ctx: Ctx): string {
  const { night, target, a, timeZone } = ctx
  const t = (d: Date) => formatTime(d, timeZone)
  const range = a.dark ? a.samples.slice(a.dark[0], a.dark[1] + 1) : []
  const win = a.window ? a.samples.slice(a.window[0], a.window[1] + 1) : []

  switch (f.id) {
    case 'altitude': {
      if (!a.peak) {
        const best = Math.max(...range.map((s) => s.alt), -90)
        return best <= 0 ? 'Below the horizon all night from here.' : `Only reaches ${Math.round(best)}° in the dark, too low to be worth it.`
      }
      const low = a.peak.alt < 30 ? ' It never climbs much higher from here.' : ''
      return `Peaks at ${Math.round(a.peak.alt)}° at ${t(a.peak.time)}, in the ${compass(a.peak.az)}.${low}`
    }
    case 'darkness': {
      if (target.kind === 'planet' || target.kind === 'double-star') return 'Bright enough to enjoy in twilight.'
      const astro = crossings(range, (s) => s.sunAlt, -18)
      const start = astro.find((c) => !c.rising)
      const end = astro.find((c) => c.rising)
      if (!start || !end) return 'No full darkness tonight. The sky stays in twilight.'
      return `Fully dark from ${t(start.time)} to ${t(end.time)}.`
    }
    case 'moon': {
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
      return `Bortle ${ctx.bortle}, ${BORTLE_LABEL[ctx.bortle] ?? ''}.${filter}`
    }
  }
}
