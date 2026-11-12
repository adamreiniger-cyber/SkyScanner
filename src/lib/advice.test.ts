import { describe, expect, it } from 'vitest'
import { advise, framing, resolvingLimit } from './advice'
import { findTarget } from './catalogue'
import { findEquipment } from './equipment'

const s50 = findEquipment('seestar-s50')
const dwarf2 = findEquipment('dwarf-2')
const binos = findEquipment('binoculars-10x50')
const dob = findEquipment('dobsonian-200')

describe('framing', () => {
  it('says the Orion Nebula overfills a Seestar S50', () => {
    expect(framing(findTarget('m42')!, s50)!.fit).toBe('too-big')
  })
  it('fits it in a wider Dwarf II field', () => {
    expect(framing(findTarget('m42')!, dwarf2)!.fit).toBe('fits')
  })
  it('calls the Ring Nebula tiny in a smart telescope', () => {
    expect(framing(findTarget('m57')!, s50)!.fit).toBe('tiny')
  })
  it('has no framing for targets without a size', () => {
    expect(framing(findTarget('jupiter')!, s50)).toBeNull()
  })
})

describe('advise', () => {
  it('turns the dual-band filter on for nebulae and off for galaxies', () => {
    const neb = advise(findTarget('m42')!, s50).tips.find((t) => t.label === 'Filter')!
    const gal = advise(findTarget('m31')!, s50).tips.find((t) => t.label === 'Filter')!
    expect(neb.value).toMatch(/on$/)
    expect(gal.value).toMatch(/off$/)
  })
  it('suggests eyepiece filters for visual observers', () => {
    expect(advise(findTarget('m27')!, dob).tips).toContainEqual({ label: 'Filter', value: 'OIII helps' })
    expect(advise(findTarget('m42')!, dob).tips).toContainEqual({ label: 'Filter', value: 'UHC helps' })
  })
  it('says whether a double star splits', () => {
    const albireo = findTarget('albireo')!
    expect(advise(albireo, s50).tips).toContainEqual({ label: 'Split', value: 'Easily' })
    expect(advise(albireo, binos).tips).toContainEqual({ label: 'Split', value: 'Easily' })
    expect(resolvingLimit(dob)).toBeLessThan(resolvingLimit(binos))
  })
})

describe('the Sun, the Moon and the newer scopes', () => {
  const sun = findTarget('sun')!
  const moon = findTarget('moon')!

  it('always names a front solar filter for the Sun', () => {
    expect(advise(sun, s50).tips.find((t) => t.label === 'Filter')!.value).toMatch(/solar filter/i)
    expect(advise(sun, dob).tips.find((t) => t.label === 'Filter')!.value).toMatch(/ISO 12312-2/)
    expect(advise(sun, binos).note).toMatch(/Never use an eyepiece solar filter/)
  })

  it('turns the duo-band filter off for the Moon', () => {
    expect(advise(moon, findEquipment('dwarf-3')).tips.find((t) => t.label === 'Filter')!.value).toBe('Duo-band filter off')
  })

  it('frames the whole Moon in the new scopes', () => {
    expect(framing(moon, findEquipment('dwarf-mini'))!.fit).toBe('fits')
    expect(framing(moon, findEquipment('dwarf-draco'))!.fit).toBe('fits')
    expect(framing(findTarget('m42')!, findEquipment('seestar-s30-pro'))!.fit).toBe('fits')
  })

  it('has presets for the Dwarf Mini, Dwarf Draco and Seestar S30 Pro', () => {
    for (const id of ['dwarf-mini', 'dwarf-draco', 'seestar-s30-pro']) expect(findEquipment(id).id).toBe(id)
  })
})
