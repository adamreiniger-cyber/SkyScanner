import { useMemo, useState } from 'react'
import { CATALOGUE, KIND_LABEL, NARROWBAND_KINDS } from '../../lib/catalogue'
import { cloudLookup, fetchWeather, nightOutlook, weatherLookup } from '../../lib/weather'
import { findEquipment } from '../../lib/equipment'
import { assess } from '../../lib/score'
import {
  DEFAULT_EQUIPMENT_ID,
  DEFAULT_PLACE,
  DEFAULT_SKY,
  hourLabel,
  hourRange,
  KEYS,
  planningTime,
  withSkyDefaults,
  type SkyChoice,
} from '../../lib/settings'
import { compassShort, computeNight, formatTime, nightStart, type Place } from '../../lib/sky'
import { copyText, listText } from '../../lib/share'
import { DEFAULT_HORIZON, describeHorizon, isOpen, withHorizonDefaults, type Horizon } from '../../lib/horizon'
import { CopyButton } from '../../components/CopyButton'
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
  const [savedHorizon] = usePersistentState<Horizon>(KEYS.horizon, DEFAULT_HORIZON)
  const horizon = useMemo(() => withHorizonDefaults(savedHorizon), [savedHorizon])
  const horizonOn = !isOpen(horizon)
  const [selectedId, setSelectedId] = usePersistentState<string | null>(KEYS.target, null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [now] = useState(() => nowProp ?? new Date())

  const kit = findEquipment(kitId)
  const startKey = nightStart(planningTime(sky.date, now)).getTime()
  const night = useMemo(() => computeNight(place, new Date(startKey)), [place, startKey])
  const only = useMemo(() => hourRange(new Date(startKey), sky.hour), [startKey, sky.hour])
  const hourText = sky.hour != null ? hourLabel(sky.hour) : null

  const forecast = useRemote(`${place.lat},${place.lon}`, (signal) => fetchWeather(place.lat, place.lon, signal))
  const weatherAt = useMemo(() => weatherLookup(forecast ?? null), [forecast])
  const cloudAt = useMemo(() => cloudLookup(weatherAt), [weatherAt])

  const assessed = useMemo(
    () =>
      CATALOGUE.map((target) => {
        const filterOn = sky.filter !== 'none' || Boolean(kit.dualBandFilter)
        const a = assess(
          night,
          target,
          {
            bortle: sky.bortle,
            narrowbandFilter: filterOn,
            kit: { apertureMm: kit.apertureMm, imaging: kit.kind === 'smart-telescope' },
            only,
            horizon: horizonOn ? horizon : undefined,
          },
          cloudAt,
          weatherAt,
        )
        return { target, a, filterOn: filterOn && NARROWBAND_KINDS.has(target.kind) }
      }),
    [night, sky, kit, cloudAt, weatherAt, only, horizon, horizonOn],
  )
  const hiddenCount = assessed.filter(({ a }) => a.hiddenByHorizon).length
  const ranked = useMemo(
    () =>
      assessed
        // The Moon and Sun aren't washed out by moonlight, so the moon filter leaves them alone.
        .filter(
          ({ target, a }) =>
            !sky.hideMoonWashed ||
            target.kind === 'moon' ||
            target.kind === 'sun' ||
            (a.factors.find((f) => f.id === 'moon')?.value ?? 1) >= 0.5,
        )
        // Targets that stay behind the user's horizon are left out (counted below).
        .filter(({ a }) => !a.hiddenByHorizon)
        // Night targets first, best first; the Sun goes at the end as a daytime extra.
        .sort((x, y) => Number(x.a.daytime) - Number(y.a.daytime) || y.a.score - x.a.score),
    [assessed, sky.hideMoonWashed],
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

  const outlook = useMemo(
    () =>
      nightOutlook(
        night.samples,
        weatherAt,
        sky.date
          ? `on ${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(startKey))}`
          : 'tonight',
      ),
    [night, weatherAt, sky.date, startKey],
  )

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
          {dateText}
          {hourText ? ` · ${hourText}` : ''} · Bortle {sky.bortle}
        </button>
        <button type="button" className="chip" onClick={() => onNavigate('equipment')}>
          {kit.name}
        </button>
        {horizonOn && (
          <button type="button" className="chip" onClick={() => onNavigate('horizon')}>
            {describeHorizon(horizon)}
          </button>
        )}
      </div>

      <section className={`outlook outlook--${forecast === undefined ? 'loading' : outlook.level}`} aria-live="polite">
        <OutlookIcon level={forecast === undefined ? 'none' : outlook.level} />
        <p>
          <strong>{forecast === undefined ? 'Checking the forecast…' : `${outlook.headline} in ${place.name}`}</strong>
          {forecast !== undefined && <span>{outlook.details.join(' · ')}</span>}
        </p>
      </section>

      <div className="targets__layout">
        <section className="target-list" aria-labelledby="h-list">
          <div className="target-list__head">
            <h2 id="h-list">{hourText ? `Best at ${hourText}` : 'Tonight’s targets'}</h2>
            <CopyButton
              label="Copy list"
              onCopy={() =>
                copyText(
                  listText(
                    `SkyShot targets for ${place.name}, ${dateText}${hourText ? ` at ${hourText}` : ''} (${kit.name})`,
                    ranked,
                  ),
                )
              }
            />
          </div>
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
                        ? `${formatTime(a.samples[a.window[0]].time)} – ${formatTime(a.samples[a.window[1]].time)} · ${
                            a.peak ? `${compassShort(a.peak.az)} ${Math.round(a.peak.alt)}°` : compassShort(a.samples[a.window[0]].az)
                          }`
                        : a.daytime
                          ? 'Not today'
                          : hourText
                            ? `Not at ${hourText}`
                            : 'Not tonight'}
                      {a.daytime && a.window ? ' · Daytime, filter only' : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {hiddenCount > 0 && (
            <p className="muted small target-list__hidden">
              {hiddenCount} {hiddenCount === 1 ? 'target stays' : 'targets stay'} behind your horizon and{' '}
              {hiddenCount === 1 ? 'is' : 'are'} hidden.{' '}
              <button type="button" className="link-button" onClick={() => onNavigate('horizon')}>
                Change horizon
              </button>
            </p>
          )}
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
            weatherAt={weatherAt}
            position={{ index, total: ranked.length }}
            prev={neighbour(index - 1)}
            next={neighbour(index + 1)}
            onSelect={select}
            onBack={() => setDetailOpen(false)}
            onChangeKit={() => onNavigate('equipment')}
            hourText={hourText}
          />
          )}
        </div>
      </div>
    </div>
  )
}

function OutlookIcon({ level }: { level: 'clear' | 'mixed' | 'cloudy' | 'none' }) {
  return (
    <svg className="outlook__icon" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      {level !== 'cloudy' && (
        <path className="outlook__moon" d="M15 4a8 8 0 1 0 9 10.5A7 7 0 0 1 15 4z" />
      )}
      {level !== 'clear' && (
        <path className="outlook__cloud" d="M8 23h13a4.5 4.5 0 0 0 .4-9 6 6 0 0 0-11.6 1.6A3.8 3.8 0 0 0 8 23z" />
      )}
    </svg>
  )
}
