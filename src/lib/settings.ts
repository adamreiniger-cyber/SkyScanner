/**
 * The user's choices and their defaults, shared by every screen.
 * Persist them with usePersistentState under the keys below.
 */
import { DEFAULT_EQUIPMENT_ID } from './equipment'
import type { SavedPlace } from './geo'

export type FilterId = 'none' | 'uhc' | 'oiii' | 'duo-band'

export type SkyChoice = {
  /** Bortle class, 1 (darkest) to 9 (inner city). */
  bortle: number
  /** Eyepiece or imaging filter in use, on top of any built into the scope. */
  filter: FilterId
  /** Night to plan for, as YYYY-MM-DD local date, or null for tonight. */
  date: string | null
  /** Hide targets the Moon washes out. */
  hideMoonWashed: boolean
  /** Plan for one hour of the night (local hour, 0 to 23), or null for the whole night. */
  hour: number | null
}

export const KEYS = { place: 'place', equipment: 'equipment', sky: 'sky', target: 'target', horizon: 'horizon' } as const

/** Until the user sets a location, start in London. */
export const DEFAULT_PLACE: SavedPlace = { lat: 51.5074, lon: -0.1278, name: 'London', source: 'default' }
export const DEFAULT_SKY: SkyChoice = { bortle: 5, filter: 'none', date: null, hideMoonWashed: false, hour: null }
export { DEFAULT_EQUIPMENT_ID }

export const FILTER_LABEL: Record<FilterId, string> = {
  none: 'No filter',
  uhc: 'UHC',
  oiii: 'OIII',
  'duo-band': 'Duo-band',
}

export const FILTER_HINT: Record<FilterId, string> = {
  none: 'Best for galaxies, clusters and double stars.',
  uhc: 'Brings out emission nebulae from light-polluted skies.',
  oiii: 'Strongest on planetary nebulae and supernova remnants.',
  'duo-band': 'Hydrogen-alpha and OIII: for imaging nebulae from towns.',
}

export const BORTLE_HINT = [
  '',
  'The Milky Way casts shadows.',
  'Airglow visible near the horizon.',
  'Some light domes on the horizon.',
  'Milky Way visible but washed out low down.',
  'Milky Way faint overhead.',
  'Milky Way only just visible overhead.',
  'Sky glows grey-orange.',
  'Only the brightest stars and clusters.',
  'A handful of stars.',
]

/** Fill in fields added since a choice was saved. */
export function withSkyDefaults(saved: Partial<SkyChoice> | null | undefined): SkyChoice {
  return { ...DEFAULT_SKY, ...(saved ?? {}) }
}

/** The moment to plan from: 21:00 on the chosen night, or now for tonight. */
export function planningTime(date: string | null, now: Date): Date {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return now
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, 21, 0)
}

export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Hours offered for one-hour planning, in night order: 17:00 through 06:00. */
export const NIGHT_HOURS = [17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]

/**
 * The chosen hour as a time range within the night that starts at `nightStart`
 * (local noon). Hours before noon fall on the next calendar day.
 */
export function hourRange(nightStart: Date, hour: number | null): { from: Date; to: Date } | undefined {
  if (hour == null || !Number.isInteger(hour) || hour < 0 || hour > 23) return undefined
  const from = new Date(nightStart)
  if (hour < 12) from.setDate(from.getDate() + 1)
  from.setHours(hour, 0, 0, 0)
  return { from, to: new Date(from.getTime() + 3_600_000) }
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
