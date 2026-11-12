import { useId, useMemo, useState } from 'react'
import type { SavedPlace } from '../../lib/geo'
import {
  BORTLE_HINT,
  DEFAULT_PLACE,
  DEFAULT_SKY,
  FILTER_HINT,
  FILTER_LABEL,
  KEYS,
  planningTime,
  toDateInput,
  withSkyDefaults,
  type FilterId,
  type SkyChoice,
} from '../../lib/settings'
import { computeNight, crossings, darkRange, formatTime, nightStart } from '../../lib/sky'
import { usePersistentState } from '../../lib/usePersistentState'
import '../settings.css'

const FILTERS: FilterId[] = ['none', 'uhc', 'oiii', 'duo-band']
const BORTLE_NAME = ['', 'Dark site', 'Truly dark', 'Rural', 'Rural/suburban', 'Suburban', 'Bright suburban', 'Suburban/urban', 'City', 'Inner city']

type Props = { now?: Date }

export function SkyScreen({ now: nowProp }: Props) {
  const [saved, setSaved] = usePersistentState<SkyChoice>(KEYS.sky, DEFAULT_SKY)
  const [place] = usePersistentState<SavedPlace>(KEYS.place, DEFAULT_PLACE)
  const [now] = useState(() => nowProp ?? new Date())
  const sky = withSkyDefaults(saved)
  const update = (patch: Partial<SkyChoice>) => setSaved({ ...sky, ...patch })
  const ids = { date: useId(), moon: useId() }

  const startMs = nightStart(planningTime(sky.date, now)).getTime()
  const start = new Date(startMs)
  const night = useMemo(() => computeNight(place, new Date(startMs)), [place, startMs])
  const summary = useMemo(() => {
    const range = darkRange(night.samples)
    const samples = range ? night.samples.slice(range[0], range[1] + 1) : []
    const astro = crossings(samples, (s) => s.sunAlt, -18)
    const darkFrom = astro.find((c) => !c.rising)
    const darkTo = astro.find((c) => c.rising)
    const moon = crossings(samples, (s) => s.moonAlt, 0).map((c) => `${c.rising ? 'rises' : 'sets'} ${formatTime(c.time)}`)
    return {
      dark: darkFrom && darkTo ? `${formatTime(darkFrom.time)} – ${formatTime(darkTo.time)}` : 'No full darkness',
      moonPct: Math.round(night.moonIllum * 100),
      moon: moon.join(', '),
    }
  }, [night])

  const dateText = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(start)

  return (
    <div className="settings">
      <h2 id="screen-title">Sky</h2>

      <section className="card" aria-labelledby="h-when">
        <h3 id="h-when">When</h3>
        <div className="when">
          <div className="field">
            <label htmlFor={ids.date}>Night of</label>
            <input
              id={ids.date}
              type="date"
              className="input"
              value={sky.date ?? toDateInput(start)}
              onChange={(e) => update({ date: e.target.value || null })}
            />
          </div>
          <button type="button" className="button" onClick={() => update({ date: null })} disabled={sky.date === null}>
            Tonight
          </button>
        </div>
        <dl className="facts">
          <div>
            <dt>Planning for</dt>
            <dd>{dateText}</dd>
          </div>
          <div>
            <dt>Fully dark</dt>
            <dd>{summary.dark}</dd>
          </div>
          <div>
            <dt>Moon</dt>
            <dd>
              {summary.moonPct}% lit{summary.moon ? `, ${summary.moon}` : ''}
            </dd>
          </div>
        </dl>
        <p className="muted small">Times are for {place.name}.</p>
      </section>

      <fieldset className="card">
        <legend>
          <h3>Sky brightness</h3>
        </legend>
        <p className="muted small">How dark is your sky? Pick the closest match. This is the Bortle scale.</p>
        <div className="choices choices--grid">
          {BORTLE_NAME.slice(1).map((name, i) => {
            const b = i + 1
            return (
              <label key={b} className="choice choice--radio">
                <input type="radio" name="bortle" value={b} checked={sky.bortle === b} onChange={() => update({ bortle: b })} />
                <span className="choice__title">
                  <span className="choice__badge">{b}</span>
                  {name}
                </span>
                <span className="choice__hint">{BORTLE_HINT[b]}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="card">
        <legend>
          <h3>Filter</h3>
        </legend>
        <p className="muted small">An extra filter you’re using. Filters built into your scope are counted automatically.</p>
        <div className="choices choices--grid">
          {FILTERS.map((f) => (
            <label key={f} className="choice choice--radio">
              <input type="radio" name="filter" value={f} checked={sky.filter === f} onChange={() => update({ filter: f })} />
              <span className="choice__title">{FILTER_LABEL[f]}</span>
              <span className="choice__hint">{FILTER_HINT[f]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="card" aria-labelledby="h-moon">
        <h3 id="h-moon">Moon filter</h3>
        <label className="toggle" htmlFor={ids.moon}>
          <span>
            <span className="choice__title">Hide targets the Moon washes out</span>
            <span className="choice__hint">Faint galaxies and nebulae near a bright Moon drop off the list.</span>
          </span>
          <input
            id={ids.moon}
            type="checkbox"
            role="switch"
            checked={sky.hideMoonWashed}
            onChange={(e) => update({ hideMoonWashed: e.target.checked })}
          />
        </label>
      </section>
    </div>
  )
}
