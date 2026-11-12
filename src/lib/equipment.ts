/**
 * Equipment presets. Adding a scope means adding one entry here; the advice
 * logic in advice.ts reads these fields and never names a model.
 *
 * Fields of view come from focal length and sensor size
 * (e.g. Seestar S50: 250 mm with a 5.6 × 3.1 mm sensor gives 1.28° × 0.72°).
 */
export type EquipmentKind = 'smart-telescope' | 'binoculars' | 'visual-telescope'

export type Equipment = {
  id: string
  name: string
  kind: EquipmentKind
  apertureMm: number
  /** Field of view in degrees: width × height, or a circle when round. */
  fov: { w: number; h: number; round?: boolean }
  /** Smart telescopes: the image scale in arcseconds per pixel. */
  pixelScale?: number
  /** Visual: magnification with the stated eyepiece. */
  magnification?: number
  /** Smart telescopes: default sub-exposure in seconds. */
  subSeconds?: number
  /** Built-in filter that passes hydrogen-alpha and oxygen-III, if any. */
  dualBandFilter?: string
}

export const EQUIPMENT: Equipment[] = [
  {
    id: 'seestar-s50',
    name: 'Seestar S50',
    kind: 'smart-telescope',
    apertureMm: 50,
    fov: { w: 1.28, h: 0.72 },
    pixelScale: 2.39,
    subSeconds: 10,
    dualBandFilter: 'LP filter',
  },
  {
    id: 'seestar-s30',
    name: 'Seestar S30',
    kind: 'smart-telescope',
    apertureMm: 30,
    fov: { w: 2.13, h: 1.2 },
    pixelScale: 3.99,
    subSeconds: 10,
    dualBandFilter: 'LP filter',
  },
  {
    id: 'dwarf-3',
    name: 'Dwarf 3',
    kind: 'smart-telescope',
    apertureMm: 35,
    fov: { w: 2.93, h: 1.65 },
    pixelScale: 2.75,
    subSeconds: 15,
    dualBandFilter: 'Duo-band filter',
  },
  {
    id: 'dwarf-2',
    name: 'Dwarf II',
    kind: 'smart-telescope',
    apertureMm: 24,
    fov: { w: 3.19, h: 1.79 },
    pixelScale: 2.99,
    subSeconds: 15,
  },
  {
    id: 'binoculars-10x50',
    name: '10×50 binoculars',
    kind: 'binoculars',
    apertureMm: 50,
    fov: { w: 6.5, h: 6.5, round: true },
    magnification: 10,
  },
  {
    id: 'dobsonian-200',
    name: '8-inch Dobsonian, 25 mm eyepiece',
    kind: 'visual-telescope',
    apertureMm: 200,
    fov: { w: 1.08, h: 1.08, round: true },
    magnification: 48,
  },
]

export const DEFAULT_EQUIPMENT_ID = 'seestar-s50'

export function findEquipment(id: string): Equipment {
  return EQUIPMENT.find((e) => e.id === id) ?? EQUIPMENT[0]
}
