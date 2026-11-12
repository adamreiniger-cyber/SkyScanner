import type { Target } from '../lib/catalogue'
import type { Equipment } from '../lib/equipment'

type Props = { target: Target; kit: Equipment }

const W = 300
const H = 180

/** The kit's field of view drawn over the target's outline, both to scale. */
export function FramingPreview({ target, kit }: Props) {
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

  return (
    <svg
      className="framing"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Framing preview: ${target.name}, ${long}′ by ${short}′, in the ${kit.name}’s ${fovText} field of view.`}
    >
      <ellipse className="framing__target" cx={cx} cy={cy} rx={(long * scale) / 2} ry={(short * scale) / 2} />
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
