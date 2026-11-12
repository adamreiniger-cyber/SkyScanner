import { describe, expect, it } from 'vitest'
import { findTarget } from './catalogue'
import { assess } from './score'
import { formatDec, formatRa, listText, targetText } from './share'
import { computeNight } from './sky'

const night = computeNight({ lat: 51.5074, lon: -0.1278, name: 'London' }, new Date(Date.UTC(2026, 10, 12, 21)))
const m42 = findTarget('m42')!

describe('copy text', () => {
  it('formats coordinates', () => {
    expect(formatRa(5.588)).toBe('05h 35m')
    expect(formatRa(23.9999)).toBe('00h 00m')
    expect(formatDec(-5.39)).toBe('−05° 23′')
    expect(formatDec(22.0167)).toBe('+22° 01′')
  })

  it('summarises a target with its window and direction', () => {
    const text = targetText(m42, assess(night, m42, { bortle: 5, narrowbandFilter: false }))
    expect(text).toMatch(/Orion Nebula/)
    expect(text).toMatch(/RA 05h 3\dm, Dec −05°/)
    expect(text).toMatch(/Best \d\d:\d\d–\d\d:\d\d, look (N|NE|E|SE|S|SW|W|NW)/)
  })

  it('lists only targets with a window', () => {
    const rows = [{ target: m42, a: assess(night, m42, { bortle: 5, narrowbandFilter: false }) }]
    expect(listText('Tonight', rows).split('\n')).toHaveLength(2)
    const none = { ...rows[0], a: { ...rows[0].a, window: null } }
    expect(listText('Tonight', [none])).toBe('Tonight')
  })
})
