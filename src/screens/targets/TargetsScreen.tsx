import { useMemo, useState } from 'react'
import { CATALOGUE, KIND_LABEL, NARROWBAND_KINDS } from '../../lib/catalogue'
import { cloudLookup, fetchCloud } from '../../lib/cloud'
import { findEquipment } from '../../lib/equipment'
import { assess } from '../../lib/score'
import {
  DEFAULT_EQUIPMENT_ID,
  DEFAULT_PLACE,
  DEFAULT_SKY,
  KEYS,
  planningTime,
  withSkyDefaults,
  type SkyChoice,
} from '../../lib/settings'
import { computeNight, formatTime, nightStart, type Place } from '../../lib/sky'
import { usePersistentState } from '../../lib/usePersistentState'
import { useRemote } from '../../lib/useRemote'
import type { ScreenId } from '../screens'
import { TargetDetails } from './TargetDetails'
import './targets.css'

type Props = { onNavigate: (screen: ScreenId) => void; now?: Date }

export function TargetsScreen({ onNavigate, now: nowProp }: Props) {
  const [place] = usePersistentState<Place>(KEYS.place, DEFAULT_PLACE)
  const [kitId] = usePersistentState(KEYS.equipment, DEFAULT_EQUIPMENT_ID)
  const [savedSky] = usePersistentState<SkyChoice>(KEYS.sky, DEFAULT_SKY)
  const sky = useMemo(() => withSkyDefaults(savedSky), [savedSky])
  const [selectedId, setSelectedId] = usePersistentState<string | null>(KEYS.target, null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [now] = useState(() => nowProp ?? new Date())

  const kit = findEquipment(kitId)
  const startKey = nightStart(planningTime(sky.date, now)).getTime()
  const night = useMemo(() => computeNight(place, new Date(startKey)), [place, startKey])

  const forecast = useRemote(`${place.lat},${place.lon}`, (signal) => fetchCloud(place.lat, place.lon, signal))
  const cloudAt = useMemo(() => cloudLookup(forecast ?? null), [forecast])

  const ranked = useMemo(
    () =>
      CATALOGUE.map((target) => {
        const filterOn = sky.filter !== 'none' || Boolean(kit.dualBandFilter)
        const a = assess(night, target, { bortle: sky.bortle, narrowbandFilter: filterOn }, cloudAt)
        return { target, a, filterOn: filterOn && NARROWBAND_KINDS.has(target.kind) }
      })
        // The Moon and Sun aren't washed out by moonlight, so the moon filter leaves them alone.
        .filter(
          ({ target, a }) =>
            !sky.hideMoonWashed ||
            target.kind === 'moon' ||
            target.kind === 'sun' ||
            (a.factors.find((f) => f.id === 'moon')?.value ?? 1) >= 0.5,
        )
        // Night targets first, best first; the Sun goes at the end as a daytime extra.
        .sort((x, y) => Number(x.a.daytime) - Number(y.a.daytime) || y.a.score - x.a.score),
    [night, sky, kit, cloudAt],
  )

  const index = Math.max(0, ranked.findIndex((r) => r.target.id === selectedId))
  const current = ranked[index]
  const neighbour = (i: number) => (ranked[i] ? { id: ranked[i].target.id, name: ranked[i].target.name } : null)

  const select = (id: string) => {
    setSelectedId(id)
    setDetailOpen(true)
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0 })
      } catch {
        // jsdom and old browsers: scrolling is a nicety.
      }
    }
  }

  const dateText = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(startKey),
  )

  return (
    <div className="targets" data-view={detailOpen ? 'detail' : 'list'}>
      <div className="context" role="group" aria-label="Your settings">
        <button type="button" className="chip" onClick={() => onNavigate('location')}>
          {place.name}
        </button>
        <button type="button" className="chip" onClick={() => onNavigate('sky')}>
          {dateText} · Bortle {sky.bortle}
        </button>
        <button type="button" className="chip" onClick={() => onNavigate('equipment')}>
          {kit.name}
        </button>
        {forecast === null && <span className="context__note">No cloud forecast</span>}
      </div>

      <div className="targets__layout">
        <section className="target-list" aria-labelledby="h-list">
          <h2 id="h-list">Tonight’s targets</h2>
          <ol>
            {ranked.map(({ target, a }) => (
              <li key={target.id}>
                <button
                  type="button"
                  className="target-row"
                  aria-current={target.id === current?.target.id ? 'true' : undefined}
                  onClick={() => select(target.id)}
                >
                  <span className={`target-row__score score-text--${a.rating.toLowerCase()}`}>{a.score}</span>
                  <span className="target-row__text">
                    <span className="target-row__name">{target.name}</span>
                    <span className="target-row__meta">
                      {[target.designation, KIND_LABEL[target.kind]].filter(Boolean).join(' · ')} ·{' '}
                      {a.window
                        ? `${formatTime(a.samples[a.window[0]].time)} – ${formatTime(a.samples[a.window[1]].time)}`
                        : a.daytime
                          ? 'Not today'
                          : 'Not tonight'}
                      {a.daytime && a.window ? ' · Daytime, filter only' : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <div className="targets__detail">
          {!current && (
            <p className="muted">
              No targets to show. Turn off “Hide targets the Moon washes out” on the Sky screen to see them all.
            </p>
          )}
          {current && (
          <TargetDetails
            key={current.target.id}
            target={current.target}
            a={current.a}
            night={night}
            kit={kit}
            bortle={sky.bortle}
            filterOn={current.filterOn}
            cloudAt={cloudAt}
            position={{ index, total: ranked.length }}
            prev={neighbour(index - 1)}
            next={neighbour(index + 1)}
            onSelect={select}
            onBack={() => setDetailOpen(false)}
            onChangeKit={() => onNavigate('equipment')}
          />
          )}
        </div>
      </div>
    </div>
  )
}
