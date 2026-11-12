import { describe, expect, it } from 'vitest'
import { parseSummary, pickImage } from './wikipedia'

const thumb = { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/M42.jpg/320px-M42.jpg', width: 320, height: 320 }
const original = { src: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/M42.jpg', width: 3000, height: 3000 }

describe('Wikipedia summary', () => {
  it('reads the text and a photo about 800 px wide', () => {
    const s = parseSummary({
      extract: ' The Orion Nebula. ',
      thumbnail: { source: thumb.src, width: 320, height: 320 },
      originalimage: { source: original.src, width: 3000, height: 3000 },
    })
    expect(s!.text).toBe('The Orion Nebula.')
    expect(s!.image).toEqual({ src: thumb.src.replace('320px-', '800px-'), width: 800, height: 800 })
  })

  it('uses a small original as it is', () => {
    const small = { ...original, width: 600, height: 400 }
    expect(pickImage(thumb, small)).toEqual(small)
  })

  it('copes with no photo, or nothing at all', () => {
    expect(parseSummary({ extract: 'Text only.' })).toEqual({ text: 'Text only.', image: null })
    expect(parseSummary({ thumbnail: { source: 'http://insecure/x.jpg', width: 1, height: 1 } })).toBeNull()
    expect(parseSummary(null)).toBeNull()
  })
})
