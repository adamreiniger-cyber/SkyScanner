/**
 * The user's choices and their defaults, shared by every screen.
 * Persist them with usePersistentState under the keys below.
 */
import { DEFAULT_EQUIPMENT_ID } from './equipment'
import type { Place } from './sky'

export type FilterId = 'none' | 'uhc' | 'oiii' | 'duo-band'

export type SkyChoice = { bortle: number; filter: FilterId }

export const KEYS = { place: 'place', equipment: 'equipment', sky: 'sky', target: 'target' } as const

/** Until the location screen exists, start in London. */
export const DEFAULT_PLACE: Place = { lat: 51.5074, lon: -0.1278, name: 'London' }
export const DEFAULT_SKY: SkyChoice = { bortle: 5, filter: 'none' }
export { DEFAULT_EQUIPMENT_ID }
