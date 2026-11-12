import { useId, useState } from 'react'
import type { Target } from '../lib/catalogue'
import type { Equipment } from '../lib/equipment'
import type { WikiImage } from '../lib/wikipedia'

type Props = { target: Target; kit: Equipment; image?: WikiImage | null }

/**
 * How much of a typical Wikipedia photo the object itself fills, along its long
 * side. Deep-sky photos leave sky around the object; Moon and Sun shots are
 * mostly disc.
 */
const PHOTO_FILL = (kind: Target['kind']) => (kind === 'moon' || kind === 'sun' ? 0.95 : 0.6)

const W = 300
const H = 180

/**
 * The kit's field of view over the target, both to scale. With a photo, the
 * photo is scaled to the target's size and cropped to the field of view, so you
 * see roughly what the frame or eyepiece will show. Without one, an outline.
 */
export function FramingPreview({ target, kit, image }: Props) {
  const clipId = useId()
  const [tries, setTries] = useState(0)
  if (!target.size) return null
  const [long, short] = target.size
  const fovW = kit.fov.w * 60
  const fovH = kit.fov.h * 60
  // Fit whichever is bigger, the field or the target, with a margin.
  const scale = Math.min((W - 20) / Math.max(fovW, long), (H - 48) / Math.max(fovH, short))
  const cx = W / 2
  const cy = H / 2 + 2 // leaves room for the labels above and below
  const fw = fovW * scale
  const fh = fovH * scale
  const deg = (v: number) => `${Math.round(v * 100) / 100}°`
  const fovText = kit.fov.round ? `${deg(kit.fov.w)} field` : `${deg(kit.fov.w)} × ${deg(kit.fov.h)}`

  // Size the photo so the object in it spans the target's long axis.
  let photo: { src: string; w: number; h: number } | null = null
  const src = image ? (tries === 0 ? image.src : tries === 1 ? image.fallback : undefined) : undefined
  if (image && src && image.width > 0 && image.height > 0) {
    const longPx = (long * scale) / PHOTO_FILL(target.kind)
    const landscape = image.width >= image.height
    const w = landscape ? longPx : (longPx * image.width) / image.height
    photo = { src, w, h: (w * image.height) / image.width }
  }

  return (
    <svg
      className="framing"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Framing preview: ${target.name}, ${long}′ by ${short}′, in the ${kit.name}’s ${fovText} field of view.`}
    >
      {photo ? (
        <>
          {/* Night sky inside the frame, so the photo's black background blends in. */}
          {kit.fov.round ? (
            <circle className="framing__sky" cx={cx} cy={cy} r={fw / 2} />
          ) : (
            <rect className="framing__sky" x={cx - fw / 2} y={cy - fh / 2} width={fw} height={fh} rx={3} />
          )}
          <defs>
            <clipPath id={clipId}>
              {kit.fov.round ? (
                <circle cx={cx} cy={cy} r={fw / 2} />
              ) : (
                <rect x={cx - fw / 2} y={cy - fh / 2} width={fw} height={fh} rx={3} />
              )}
            </clipPath>
          </defs>
          {/* The rest of the photo, dimmed, for context outside the frame. */}
          <image
            className="framing__photo framing__photo--outside"
            href={photo.src}
            x={cx - photo.w / 2}
            y={cy - photo.h / 2}
            width={photo.w}
            height={photo.h}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          />
          <image
            className="framing__photo"
            href={photo.src}
            x={cx - photo.w / 2}
            y={cy - photo.h / 2}
            width={photo.w}
            height={photo.h}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid meet"
            onError={() => setTries((n) => n + 1)}
          />
        </>
      ) : null}
      <ellipse
        className={photo ? 'framing__target framing__target--behind' : 'framing__target'}
        cx={cx}
        cy={cy}
        rx={(long * scale) / 2}
        ry={(short * scale) / 2}
      />
      {kit.fov.round ? (
        <circle className="framing__fov" cx={cx} cy={cy} r={fw / 2} />
      ) : (
        <rect className="framing__fov" x={cx - fw / 2} y={cy - fh / 2} width={fw} height={fh} rx={3} />
      )}
      <text className="framing__label framing__label--fov" x={8} y={16}>
        Field of view {fovText}
      </text>
      <text className="framing__label" x={W / 2} y={H - 4} textAnchor="middle">
        {target.name}: {long}′ × {short}′
      </text>
    </svg>
  )
}
