/**
 * The user's horizon: which compass directions they can see from their spot,
 * and how high trees or houses reach. Targets hidden behind it don't count.
 */

/** The eight compass sectors, clockwise from north. Each covers 45° centred on its point. */
export const SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
export type Sector = (typeof SECTORS)[number]

export const SECTOR_NAME: Record<Sector, string> = {
  N: 'North',
  NE: 'North-east',
  E: 'East',
  SE: 'South-east',
  S: 'South',
  SW: 'South-west',
  W: 'West',
  NW: 'North-west',
}

export type Horizon = {
  /** Open (true) or blocked (false), one per sector in SECTORS order. */
  open: boolean[]
  /** Height of trees, houses and hills in the open directions, in degrees above the horizon. */
  minAlt: number
}

export const DEFAULT_HORIZON: Horizon = { open: SECTORS.map(() => true), minAlt: 0 }

/** Fill in a saved horizon, falling back to all open where it's missing or malformed. */
export function withHorizonDefaults(saved: Partial<Horizon> | null | undefined): Horizon {
  const open =
    Array.isArray(saved?.open) && saved.open.length === SECTORS.length
      ? saved.open.map((o) => o !== false)
      : DEFAULT_HORIZON.open
  const minAlt = typeof saved?.minAlt === 'number' && Number.isFinite(saved.minAlt) ? Math.min(60, Math.max(0, saved.minAlt)) : 0
  return { open, minAlt }
}

export function sectorOf(az: number): number {
  return Math.round((((az % 360) + 360) % 360) / 45) % 8
}

/** Can the user see a point at this azimuth and altitude? */
export function canSee(h: Horizon, az: number, alt: number): boolean {
  return h.open[sectorOf(az)] && alt >= h.minAlt
}

/** True when nothing is blocked, so the horizon changes nothing. */
export function isOpen(h: Horizon): boolean {
  return h.minAlt <= 0 && h.open.every(Boolean)
}

/** Short summary, e.g. "E to SW open, above 15°". */
export function describeHorizon(h: Horizon): string {
  const above = h.minAlt > 0 ? `, above ${h.minAlt}°` : ''
  const count = h.open.filter(Boolean).length
  if (count === 8) return `All directions open${above}`
  if (count === 0) return 'Every direction blocked'
  // Find the start of a run of open sectors, so a single run reads "E to SW".
  const runs: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    if (h.open[i] && !h.open[(i + 7) % 8]) {
      let j = i
      while (h.open[(j + 1) % 8]) j = (j + 1) % 8
      runs.push([i, j])
    }
  }
  const text = runs.map(([a, b]) => (a === b ? SECTORS[a] : `${SECTORS[a]} to ${SECTORS[b]}`)).join(', ')
  return `${text} open${above}`
}
