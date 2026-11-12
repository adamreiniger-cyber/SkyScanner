/**
 * Advice for one target with one piece of equipment: how it frames, and
 * exposure or eyepiece tips. Reads equipment fields only, never model names.
 */
import { NARROWBAND_KINDS, type Target } from './catalogue'
import type { Equipment } from './equipment'

export type Fit = 'tiny' | 'small' | 'fits' | 'fills' | 'too-big'

export type Framing = {
  fit: Fit
  /** Target size as a fraction of the field, 0 to 1+ on the tighter axis. */
  ratio: number
  text: string
}

export type Tip = { label: string; value: string }

export type Advice = { framing: Framing | null; tips: Tip[]; note: string | null }

export function framing(target: Target, kit: Equipment): Framing | null {
  if (!target.size) return null
  const [long, short] = target.size
  const fovW = kit.fov.w * 60
  const fovH = kit.fov.h * 60
  const ratio = Math.max(long / fovW, short / fovH)
  const imaging = kit.kind === 'smart-telescope'
  let fit: Fit
  let text: string
  if (ratio < 0.05) {
    fit = 'tiny'
    text = imaging
      ? 'Very small in the frame. You’ll need to crop, and a longer focal length would show more detail.'
      : 'Very small at this magnification. Try a higher-power eyepiece.'
  } else if (ratio < 0.3) {
    fit = 'small'
    text = imaging ? 'Small in the frame, with lots of room around it. Cropping works well.' : 'Small but clear in the field.'
  } else if (ratio < 0.8) {
    fit = 'fits'
    text = 'Fits comfortably, with room around it.'
  } else if (ratio <= 1.1) {
    fit = 'fills'
    text = 'Fills the field of view.'
  } else {
    fit = 'too-big'
    text = imaging ? 'Bigger than the frame. A mosaic will capture all of it.' : 'Bigger than the field of view, so pan around it.'
  }
  return { fit, ratio, text }
}

/** Smallest separation in arcseconds this kit can show as two stars. */
export function resolvingLimit(kit: Equipment): number {
  const dawes = 116 / kit.apertureMm
  if (kit.pixelScale) return Math.max(dawes, kit.pixelScale * 2.5)
  if (kit.magnification) return Math.max(dawes, 120 / kit.magnification)
  return dawes
}

export function advise(target: Target, kit: Equipment): Advice {
  const tips: Tip[] = []
  const narrowband = NARROWBAND_KINDS.has(target.kind)
  const mag = target.magnitude ?? 6

  if (target.kind === 'double-star' && target.double) {
    const limit = resolvingLimit(kit)
    const sep = target.double.separation
    tips.push({ label: 'Separation', value: `${sep}″` })
    tips.push({ label: 'Split', value: sep >= limit * 2 ? 'Easily' : sep >= limit ? 'Just' : 'No' })
    if (target.double.colours) tips.push({ label: 'Colours', value: target.double.colours })
  } else if (target.kind === 'sun') {
    if (kit.kind === 'smart-telescope') {
      tips.push({ label: 'Filter', value: 'Solar filter, fitted over the front' })
      tips.push({ label: 'Mode', value: 'Solar mode' })
    } else {
      tips.push({ label: 'Filter', value: 'Certified white-light filter over the front (ISO 12312-2)' })
      if (kit.magnification) tips.push({ label: 'Magnification', value: `${kit.magnification}×` })
    }
  } else if (target.kind === 'moon') {
    if (kit.kind === 'smart-telescope') {
      tips.push({ label: 'Mode', value: 'Solar system or Moon mode' })
      tips.push({ label: 'Filter', value: kit.dualBandFilter ? `${kit.dualBandFilter} off` : 'None' })
    } else {
      if (kit.magnification) tips.push({ label: 'Magnification', value: `${kit.magnification}×, then higher for craters` })
      tips.push({ label: 'Filter', value: 'Moon filter or polariser (optional)' })
    }
  } else if (target.kind === 'planet') {
    if (kit.kind === 'smart-telescope') {
      tips.push({ label: 'Mode', value: 'Solar system mode' })
      tips.push({ label: 'Filter', value: 'None' })
    } else {
      tips.push({ label: 'Magnification', value: kit.magnification ? `${kit.magnification}× or more` : 'High' })
    }
  } else if (kit.kind === 'smart-telescope') {
    tips.push({ label: 'Sub length', value: `${kit.subSeconds ?? 10} s` })
    tips.push({ label: 'Total time', value: mag < 5 ? '30 min or more' : mag < 8 ? '60 min or more' : '2 hours or more' })
    tips.push({
      label: 'Filter',
      value: kit.dualBandFilter ? (narrowband ? `${kit.dualBandFilter} on` : `${kit.dualBandFilter} off`) : 'None needed',
    })
  } else {
    if (kit.magnification) tips.push({ label: 'Magnification', value: `${kit.magnification}×` })
    tips.push({
      label: 'Filter',
      value: target.kind === 'planetary-nebula' ? 'OIII helps' : narrowband ? 'UHC helps' : 'None',
    })
    if (mag > 6) tips.push({ label: 'Technique', value: 'Averted vision' })
  }

  let note = target.imagingNote ?? null
  if (target.kind === 'sun') {
    note =
      kit.kind === 'smart-telescope'
        ? 'Fit the solar filter made for your scope before you point it at the Sun, and keep it on until you point away.'
        : 'Only use a filter that covers the whole front of the scope or both binocular lenses. Never use an eyepiece solar filter, and cap the finder.'
  }
  if (!note && kit.kind === 'smart-telescope' && narrowband && kit.dualBandFilter) {
    note = `The ${kit.dualBandFilter.toLowerCase()} pulls the nebula’s glow out of a bright sky.`
  }
  if (
    !note &&
    kit.kind === 'smart-telescope' &&
    !narrowband &&
    kit.dualBandFilter &&
    !['double-star', 'moon', 'sun'].includes(target.kind)
  ) {
    note = `Leave the ${kit.dualBandFilter.toLowerCase()} off: it dims starlight, which is what galaxies and clusters are made of.`
  }
  return { framing: framing(target, kit), tips, note }
}
