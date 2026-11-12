/**
 * Plain-text summaries for the Copy buttons: easy to paste into notes, a chat,
 * or a smart telescope app's search box.
 */
import type { Target } from './catalogue'
import type { Assessment } from './score'
import { compassShort, formatTime } from './sky'

/** Right ascension in hours as "05h 35m". */
export function formatRa(ra: number): string {
  let h = Math.floor(ra)
  let m = Math.round((ra - h) * 60)
  if (m === 60) {
    h = (h + 1) % 24
    m = 0
  }
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

/** Declination in degrees as "+22° 01′" or "−05° 23′". */
export function formatDec(dec: number): string {
  const sign = dec < 0 ? '−' : '+'
  const abs = Math.abs(dec)
  let d = Math.floor(abs)
  let m = Math.round((abs - d) * 60)
  if (m === 60) {
    d += 1
    m = 0
  }
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}′`
}

function windowLine(a: Assessment): string {
  if (!a.window) return a.daytime ? 'Not today' : 'Not tonight'
  const start = a.samples[a.window[0]]
  const end = a.samples[a.window[1]]
  const peak = a.peak ? `, peaks ${Math.round(a.peak.alt)}° ${compassShort(a.peak.az)} at ${formatTime(a.peak.time)}` : ''
  return `Best ${formatTime(start.time)}–${formatTime(end.time)}, look ${compassShort(start.az)}${peak}`
}

function title(target: Target): string {
  return target.designation && target.designation !== target.name ? `${target.designation} ${target.name}` : target.name
}

/** One target, several lines. */
export function targetText(target: Target, a: Assessment): string {
  const lines = [`${title(target)} · ${a.score} ${a.rating}`]
  if (target.ra != null && target.dec != null) lines.push(`RA ${formatRa(target.ra)}, Dec ${formatDec(target.dec)} (J2000)`)
  lines.push(windowLine(a))
  return lines.join('\n')
}

/** The ranked list, one line per target worth looking at. */
export function listText(heading: string, rows: { target: Target; a: Assessment }[]): string {
  const lines = rows
    .filter(({ a }) => a.window)
    .map(({ target, a }, i) => `${i + 1}. ${title(target)} (${a.score}): ${windowLine(a)}`)
  return [heading, ...lines].join('\n')
}

/** Copy to the clipboard, falling back to a hidden textarea where the API is missing. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the old way.
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}
