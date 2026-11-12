import { useEffect, useRef, useState } from 'react'
import type { Assessment, CloudLookup } from '../lib/score'
import { crossings, formatTime } from '../lib/sky'
import './AltitudeChart.css'

type Props = { a: Assessment; name: string; cloudAt: CloudLookup }

const HEIGHT = 170
const TOP = 12
const BOTTOM = 140 // y of the 0° line is a little above this
const LEFT = 30
const RIGHT = 8
const MIN_ALT = -5
const PAD_SAMPLES = 6 // one hour either side of sunset and sunrise

/** Width of an element in CSS pixels, so the SVG text stays a readable size. */
function useWidth<T extends Element>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function AltitudeChart({ a, name, cloudAt }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(340)
  // Night targets show the dark hours plus an hour either side; the Sun shows the whole day.
  const span = a.dark && !a.daytime
  const from = span ? Math.max(0, a.dark![0] - PAD_SAMPLES) : 0
  const to = span ? Math.min(a.samples.length - 1, a.dark![1] + PAD_SAMPLES) : a.samples.length - 1
  const shown = a.samples.slice(from, to + 1)
  const maxAlt = Math.max(60, Math.ceil((Math.max(...shown.map((s) => s.alt)) + 5) / 10) * 10)

  const x = (i: number) => LEFT + ((i - from) / (to - from)) * (width - LEFT - RIGHT)
  const y = (alt: number) => TOP + (1 - (Math.max(MIN_ALT, alt) - MIN_ALT) / (maxAlt - MIN_ALT)) * (BOTTOM - TOP)

  const path = shown.map((s, k) => `${k ? 'L' : 'M'}${x(from + k).toFixed(1)} ${y(s.alt).toFixed(1)}`).join(' ')

  // Twilight: runs of samples where the Sun is above -18°.
  const twilight: [number, number][] = []
  shown.forEach((s, k) => {
    const i = from + k
    if (s.sunAlt > -18) {
      const last = twilight[twilight.length - 1]
      if (last && last[1] === i - 1) last[1] = i
      else twilight.push([i, i])
    }
  })

  const moonEvents = crossings(shown, (s) => s.moonAlt, 0)
  const startMs = shown[0].time.getTime()
  const spanMs = shown[shown.length - 1].time.getTime() - startMs
  const xt = (d: Date) => LEFT + ((d.getTime() - startMs) / spanMs) * (width - LEFT - RIGHT)

  // Hour ticks every 3 hours on phones, every 2 on wider screens.
  const every = width < 480 ? 3 : 2
  const ticks: Date[] = []
  const first = new Date(startMs)
  first.setMinutes(0, 0, 0)
  for (let t = first.getTime() + 3_600_000; t < startMs + spanMs; t += 3_600_000) {
    const d = new Date(t)
    if (d.getHours() % every === 0) ticks.push(d)
  }

  // Hourly cloud strip, only when there's a forecast.
  const hours: { x: number; w: number; cover: number }[] = []
  for (let t = first.getTime(); t < startMs + spanMs; t += 3_600_000) {
    const cover = cloudAt(new Date(t))
    if (cover == null) continue
    const x0 = Math.max(LEFT, xt(new Date(t)))
    const x1 = Math.min(width - RIGHT, xt(new Date(t + 3_600_000)))
    if (x1 > x0) hours.push({ x: x0, w: x1 - x0 - 1, cover })
  }

  const when = a.daytime ? 'the day' : 'the night'
  const label = a.window
    ? `Altitude of ${name} through ${when}. Best window ${formatTime(a.samples[a.window[0]].time)} to ${formatTime(a.samples[a.window[1]].time)}${a.peak ? `, peaking at ${Math.round(a.peak.alt)}° at ${formatTime(a.peak.time)}` : ''}.`
    : `Altitude of ${name} through ${when}. It is not well placed ${a.daytime ? 'today' : 'tonight'}.`

  return (
    <div ref={ref} className="alt-chart">
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label={label}>
        {twilight.map(([i0, i1]) => (
          <rect key={i0} className="alt-chart__twilight" x={x(i0)} y={TOP} width={Math.max(1, x(i1) - x(i0))} height={BOTTOM - TOP} />
        ))}
        {a.window && (
          <rect
            className="alt-chart__window"
            x={x(a.window[0])}
            y={TOP}
            width={Math.max(2, x(a.window[1]) - x(a.window[0]))}
            height={BOTTOM - TOP}
            rx={4}
          />
        )}
        {[0, 30, 60].filter((v) => v < maxAlt).map((v) => (
          <g key={v}>
            <line className={v ? 'alt-chart__grid' : 'alt-chart__horizon'} x1={LEFT} x2={width - RIGHT} y1={y(v)} y2={y(v)} />
            <text className="alt-chart__label" x={0} y={y(v) + 4}>
              {v}°
            </text>
          </g>
        ))}
        {moonEvents.map((m) => (
          <g key={m.time.getTime()}>
            <line className="alt-chart__moon" x1={xt(m.time)} x2={xt(m.time)} y1={TOP} y2={BOTTOM} />
            <text className="alt-chart__label" x={xt(m.time) + 4} y={TOP + 12}>
              {m.rising ? 'Moonrise' : 'Moonset'}
            </text>
          </g>
        ))}
        <path className="alt-chart__curve" d={path} />
        {a.peak && <circle className="alt-chart__peak" cx={x(a.samples.indexOf(a.peak))} cy={y(a.peak.alt)} r={4.5} />}
        {ticks.map((d) => (
          <text key={d.getTime()} className="alt-chart__label" x={xt(d)} y={BOTTOM + 18} textAnchor="middle">
            {formatTime(d)}
          </text>
        ))}
        {hours.map((h) => (
          <rect
            key={h.x}
            className="alt-chart__cloud"
            x={h.x}
            y={BOTTOM + 24}
            width={Math.max(1, h.w)}
            height={6}
            rx={2}
            style={{ opacity: 0.15 + (h.cover / 100) * 0.85 }}
          />
        ))}
      </svg>
      <ul className="alt-chart__legend">
        <li>
          <span className="alt-chart__key alt-chart__key--window" aria-hidden="true" />
          Best window
        </li>
        <li>
          <span className="alt-chart__key alt-chart__key--twilight" aria-hidden="true" />
          Twilight
        </li>
        {hours.length > 0 && (
          <li>
            <span className="alt-chart__key alt-chart__key--cloud" aria-hidden="true" />
            Cloud (darker is cloudier)
          </li>
        )}
      </ul>
    </div>
  )
}
