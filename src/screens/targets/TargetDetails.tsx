import { useState } from 'react'
import { AltitudeChart } from '../../components/AltitudeChart'
import { FramingPreview } from '../../components/FramingPreview'
import { advise } from '../../lib/advice'
import { KIND_LABEL, NARROWBAND_KINDS, type Target } from '../../lib/catalogue'
import type { Equipment } from '../../lib/equipment'
import { explainFactor, factorLabel, factorRating } from '../../lib/explain'
import type { Assessment, CloudLookup } from '../../lib/score'
import type { WeatherLookup } from '../../lib/weather'
import { compass, crossings, formatTime, type NightBase } from '../../lib/sky'
import { useRemote } from '../../lib/useRemote'
import { astrobinUrl, fetchSummary, stellariumUrl, wikiUrl, type WikiImage } from '../../lib/wikipedia'
import { SolarImage, SolarSafety, SPACE_WEATHER_URL } from './SolarSafety'

type Neighbour = { id: string; name: string } | null

type Props = {
  target: Target
  a: Assessment
  night: NightBase
  kit: Equipment
  bortle: number
  filterOn: boolean
  cloudAt: CloudLookup
  weatherAt: WeatherLookup
  position: { index: number; total: number }
  prev: Neighbour
  next: Neighbour
  onSelect: (id: string) => void
  onBack: () => void
  onChangeKit: () => void
}

const RATING_CLASS: Record<string, string> = { Great: 'great', Good: 'good', Fair: 'fair', Poor: 'poor', 'No data': 'none' }

export function TargetDetails(props: Props) {
  const { target, a, night, kit, cloudAt } = props
  const t = formatTime
  const summary = useRemote(target.wiki, (signal) => fetchSummary(target.wiki, signal))
  const advice = advise(target, kit)

  const subtitle = [target.designation, KIND_LABEL[target.kind], target.constellation].filter(Boolean).join(' · ')
  const rise = crossings(a.samples, (s) => s.alt, 0)
  const rises = rise.find((c) => c.rising)
  const sets = rise.find((c) => !c.rising)

  const facts = [
    target.magnitude != null && `Mag ${target.magnitude.toFixed(1)}`,
    target.size && `${target.size[0]}′ × ${target.size[1]}′`,
    target.distance,
    rises && `Rises ${t(rises.time)}`,
    sets && `Sets ${t(sets.time)}`,
  ].filter((f): f is string => Boolean(f))

  const windowText = a.window
    ? `${t(a.samples[a.window[0]].time)} – ${t(a.samples[a.window[1]].time)}`
    : a.daytime
      ? 'Not today'
      : 'Not tonight'
  const peakText = a.peak
    ? `Peaks at ${Math.round(a.peak.alt)}° at ${t(a.peak.time)}, ${compass(a.peak.az)}`
    : 'Too low or too bright to be worth it'
  const ratingClass = RATING_CLASS[a.rating]
  const isSun = target.kind === 'sun'
  const when = a.daytime ? 'today' : 'tonight'

  return (
    <article className="details" aria-labelledby="target-name">
      <div className="details__top">
        <button type="button" className="details__back" onClick={props.onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All targets
        </button>
      </div>

      <header className="details__hero">
        <div className="details__title">
          <p className="details__eyebrow">{subtitle}</p>
          <h2 id="target-name">{target.name}</h2>
          <ul className="details__facts" aria-label="Key facts">
            {facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="details__summary">
          <div className={`score score--${ratingClass}`}>
            <span className="score__value">{a.score}</span>
            <span className="score__label">
              {a.rating} {when}
            </span>
          </div>
          <div className="window">
            <span className="window__label">Best window</span>
            <span className="window__value">{windowText}</span>
            <span className="window__peak">{peakText}</span>
          </div>
        </div>
      </header>

      {isSun && <SolarSafety />}

      <TargetPhoto name={target.name} wiki={target.wiki} image={summary === undefined ? undefined : (summary?.image ?? null)} />

      <div className="details__grid">
        <div className="details__col">
          <section className="card" aria-labelledby="h-tonight">
            <div className="card__head">
              <h3 id="h-tonight">{a.daytime ? 'Today' : 'Tonight'}</h3>
              <span className="muted small">Altitude above the horizon</span>
            </div>
            <AltitudeChart a={a} name={target.name} cloudAt={cloudAt} />
          </section>

          <section className="card" aria-labelledby="h-why">
            <h3 id="h-why">Why it scores {a.score}</h3>
            <ul className="factors">
              {a.factors.map((f) => {
                const rating = factorRating(f.value)
                return (
                  <li key={f.id} className="factor">
                    <div className="factor__head">
                      <span>{factorLabel(f.id, target)}</span>
                      <span className={`factor__rating factor__rating--${RATING_CLASS[rating]}`}>{rating}</span>
                    </div>
                    <div className="factor__bar" aria-hidden="true">
                      <div
                        className={`factor__fill factor__fill--${RATING_CLASS[rating]}`}
                        style={{ width: `${Math.round((f.value ?? 0) * 100)}%` }}
                      />
                    </div>
                    <p className="factor__detail">
                      {explainFactor(f, {
                        night,
                        target,
                        a,
                        bortle: props.bortle,
                        filterOn: props.filterOn,
                        kit: { name: kit.name, imaging: kit.kind === 'smart-telescope' },
                        weatherAt: props.weatherAt,
                      })}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <div className="details__col">
          <section className="card" aria-labelledby="h-kit">
            <div className="card__head">
              <h3 id="h-kit">With your {kit.name}</h3>
              <button type="button" className="link-button" onClick={props.onChangeKit}>
                Change
              </button>
            </div>
            {advice.framing && (
              <figure className="framing-box">
                <FramingPreview target={target} kit={kit} image={summary?.image} />
                <figcaption>{advice.framing.text}</figcaption>
              </figure>
            )}
            {advice.tips.length > 0 && (
              <dl className="tips">
                {advice.tips.map((tip) => (
                  <div key={tip.label} className="tip">
                    <dt>{tip.label}</dt>
                    <dd>{tip.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {advice.note && <p>{advice.note}</p>}
            {NARROWBAND_KINDS.has(target.kind) && !kit.dualBandFilter && kit.kind === 'smart-telescope' && (
              <p className="muted small">A duo-band filter would help with this nebula.</p>
            )}
          </section>

          <section className="card" aria-labelledby="h-find">
            <h3 id="h-find">How to find it</h3>
            <p>{target.findingTip}</p>
            {a.window && (
              <p className="muted small">
                Look {compass(a.samples[a.window[0]].az)} at {t(a.samples[a.window[0]].time)}
                {a.peak ? `, ${compass(a.peak.az)} at ${t(a.peak.time)}` : ''}.
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="h-about">
            <h3 id="h-about">About</h3>
            {isSun && <SolarImage />}
            <p>{summary?.text ?? target.description}</p>
            {summary?.text && <p className="muted small">From Wikipedia</p>}
            <nav aria-label="Look it up" className="links">
              <a href={wikiUrl(target.wiki)} target="_blank" rel="noreferrer">
                Wikipedia
                <ExternalIcon />
              </a>
              <a href={stellariumUrl(target.searchName)} target="_blank" rel="noreferrer">
                Stellarium Web
                <ExternalIcon />
              </a>
              <a href={astrobinUrl(target.searchName)} target="_blank" rel="noreferrer">
                AstroBin
                <ExternalIcon />
              </a>
              {isSun && (
                <a href={SPACE_WEATHER_URL} target="_blank" rel="noreferrer">
                  SpaceWeatherLive
                  <ExternalIcon />
                </a>
              )}
            </nav>
          </section>
        </div>
      </div>

      <nav className="stepper" aria-label="Other targets">
        <button type="button" disabled={!props.prev} onClick={() => props.prev && props.onSelect(props.prev.id)}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="stepper__name">{props.prev ? props.prev.name : 'Previous'}</span>
        </button>
        <span className="stepper__pos">
          {props.position.index + 1} of {props.position.total}
        </span>
        <button
          type="button"
          className="stepper__next"
          disabled={!props.next}
          onClick={() => props.next && props.onSelect(props.next.id)}
        >
          <span className="stepper__name">{props.next ? props.next.name : 'Next'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </nav>
    </article>
  )
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

/**
 * The target's lead photo from Wikipedia. Space is held while it loads, and it
 * disappears if there's no photo or it fails. Hidden in red night mode, where a
 * bright colour photo would spoil dark adaptation.
 */
function TargetPhoto({ name, wiki, image }: { name: string; wiki: string; image: WikiImage | null | undefined }) {
  const [tries, setTries] = useState(0)
  const src = image ? (tries === 0 ? image.src : tries === 1 ? image.fallback : undefined) : undefined
  if (image === null || (image && !src)) return null
  return (
    <figure className="details__photo">
      <div className="details__photo-frame">
        {image && (
          <img
            src={src}
            width={image.width}
            height={image.height}
            alt={`Photo of ${name}`}
            loading="lazy"
            decoding="async"
            onError={() => setTries((n) => n + 1)}
          />
        )}
      </div>
      {image && (
        <figcaption className="muted small">
          Photo from <a href={wikiUrl(wiki)} target="_blank" rel="noreferrer">Wikipedia</a>, where you’ll find its credit and licence.
        </figcaption>
      )}
    </figure>
  )
}
