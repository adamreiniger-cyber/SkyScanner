import { useId } from 'react'
import {
  DEFAULT_HORIZON,
  describeHorizon,
  SECTOR_NAME,
  SECTORS,
  withHorizonDefaults,
  type Horizon,
} from '../../lib/horizon'
import { KEYS } from '../../lib/settings'
import { usePersistentState } from '../../lib/usePersistentState'
import '../settings.css'
import './horizon.css'

/** The compass sectors laid out as a 3 × 3 grid, with "you" in the middle. */
const GRID: (number | null)[] = [7, 0, 1, 6, null, 2, 5, 4, 3]

export function HorizonScreen() {
  const [saved, setSaved] = usePersistentState<Horizon>(KEYS.horizon, DEFAULT_HORIZON)
  const h = withHorizonDefaults(saved)
  const ids = { height: useId(), hint: useId() }
  const toggle = (i: number) => setSaved({ ...h, open: h.open.map((o, j) => (j === i ? !o : o)) })

  return (
    <div className="settings">
      <h2 id="screen-title">Horizon</h2>

      <section className="card" aria-labelledby="h-directions">
        <h3 id="h-directions">Which way can you see?</h3>
        <p className="muted small" id={ids.hint}>
          Tap a direction to block it, for example where your house or a hedge is. Targets that stay behind blocked
          directions all night drop off your list.
        </p>
        <div className="compass" role="group" aria-labelledby="h-directions" aria-describedby={ids.hint}>
          {GRID.map((i, cell) =>
            i == null ? (
              <div key={cell} className="compass__you" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                </svg>
                You
              </div>
            ) : (
              <button
                key={cell}
                type="button"
                className="compass__dir"
                aria-pressed={h.open[i]}
                aria-label={`${SECTOR_NAME[SECTORS[i]]}: ${h.open[i] ? 'open' : 'blocked'}`}
                onClick={() => toggle(i)}
              >
                <span className="compass__abbr">{SECTORS[i]}</span>
                <span className="compass__state">{h.open[i] ? 'Open' : 'Blocked'}</span>
              </button>
            ),
          )}
        </div>
        <p className="horizon__summary" aria-live="polite">
          {describeHorizon(h)}
        </p>
      </section>

      <section className="card" aria-labelledby="h-height">
        <h3 id="h-height">Trees and rooftops</h3>
        <label htmlFor={ids.height} className="muted small">
          How high do things reach in the open directions? Targets lower than this don’t count.
        </label>
        <div className="horizon__height">
          <input
            id={ids.height}
            type="range"
            min={0}
            max={40}
            step={5}
            value={h.minAlt}
            onChange={(e) => setSaved({ ...h, minAlt: Number(e.target.value) })}
          />
          <output htmlFor={ids.height}>{h.minAlt === 0 ? 'Clear to the horizon' : `${h.minAlt}° up`}</output>
        </div>
        <p className="muted small">A fist held at arm’s length is about 10° tall.</p>
      </section>

      <button
        type="button"
        className="button"
        onClick={() => setSaved(DEFAULT_HORIZON)}
        disabled={describeHorizon(h) === describeHorizon(DEFAULT_HORIZON)}
      >
        Reset: everything open
      </button>
    </div>
  )
}
