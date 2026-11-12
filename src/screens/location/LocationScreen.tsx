import { useId, useState, type FormEvent } from 'react'
import { formatCoords, locate, searchTowns, validCoords, type SavedPlace, type TownResult } from '../../lib/geo'
import { DEFAULT_PLACE, KEYS } from '../../lib/settings'
import { usePersistentState } from '../../lib/usePersistentState'
import '../settings.css'

const SOURCE_TEXT: Record<string, string> = {
  device: 'From your device',
  ip: 'Approximate, from your internet connection',
  search: 'From town search',
  manual: 'Entered by hand',
  default: 'Default location. Set your own below.',
}

type Status = { kind: 'idle' } | { kind: 'busy'; text: string } | { kind: 'error'; text: string } | { kind: 'done'; text: string }

export function LocationScreen() {
  const [place, setPlace] = usePersistentState<SavedPlace>(KEYS.place, DEFAULT_PLACE)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TownResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const ids = { search: useId(), lat: useId(), lon: useId(), name: useId() }
  const [manualName, setManualName] = useState('')

  const choose = (next: SavedPlace, text: string) => {
    setPlace(next)
    setStatus({ kind: 'done', text })
  }

  const useMyLocation = async () => {
    setStatus({ kind: 'busy', text: 'Finding you…' })
    const found = await locate()
    if (found) choose(found, `Location set to ${found.name}.`)
    else setStatus({ kind: 'error', text: 'Couldn’t find your location. Search for a town or enter coordinates instead.' })
  }

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (query.trim().length < 2) return
    setSearching(true)
    setSearchError(null)
    const found = await searchTowns(query)
    setSearching(false)
    if (found == null) {
      setResults(null)
      setSearchError('Town search isn’t available right now. Try again, or enter coordinates below.')
    } else {
      setResults(found)
    }
  }

  const saveManual = (e: FormEvent) => {
    e.preventDefault()
    const la = Number(lat)
    const lo = Number(lon)
    if (lat.trim() === '' || lon.trim() === '' || !validCoords(la, lo)) {
      setManualError('Latitude must be between -90 and 90, and longitude between -180 and 180.')
      return
    }
    setManualError(null)
    const name = manualName.trim() || formatCoords(la, lo)
    choose({ lat: la, lon: lo, name, source: 'manual' }, `Location set to ${name}.`)
  }

  return (
    <div className="settings">
      <h2 id="screen-title">Location</h2>

      <section className="card current" aria-labelledby="h-current">
        <h3 id="h-current" className="current__label">
          Observing from
        </h3>
        <p className="current__name">{place.name}</p>
        <p className="muted small">
          {formatCoords(place.lat, place.lon)} · {SOURCE_TEXT[place.source ?? 'manual']}
        </p>
        <button type="button" className="button button--primary" onClick={useMyLocation} disabled={status.kind === 'busy'}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="7" />
          </svg>
          Use my location
        </button>
        <p className={`status status--${status.kind}`} role="status" aria-live="polite">
          {status.kind === 'idle' ? '' : status.text}
        </p>
      </section>

      <section className="card" aria-labelledby="h-search">
        <h3 id="h-search">Search for a town</h3>
        <form className="search" onSubmit={search} role="search">
          <label htmlFor={ids.search} className="visually-hidden">
            Town or city
          </label>
          <input
            id={ids.search}
            type="search"
            className="input"
            placeholder="Town or city"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="button" disabled={searching || query.trim().length < 2}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {searchError && <p className="status status--error">{searchError}</p>}
        {results && results.length === 0 && <p className="muted small">No places found. Try another spelling.</p>}
        {results && results.length > 0 && (
          <ul className="choices" aria-label="Search results">
            {results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  className="choice"
                  onClick={() => {
                    choose({ lat: r.lat, lon: r.lon, name: r.name, source: 'search' }, `Location set to ${r.name}.`)
                    setResults(null)
                    setQuery('')
                  }}
                >
                  <span className="choice__title">{r.name}</span>
                  <span className="choice__hint">{r.detail || formatCoords(r.lat, r.lon)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="h-manual">
        <h3 id="h-manual">Enter coordinates</h3>
        <p className="muted small">Works without a connection. Use decimal degrees; south and west are negative.</p>
        <form className="manual" onSubmit={saveManual} noValidate>
          <div className="field">
            <label htmlFor={ids.lat}>Latitude</label>
            <input
              id={ids.lat}
              className="input"
              inputMode="decimal"
              placeholder="51.50"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.lon}>Longitude</label>
            <input
              id={ids.lon}
              className="input"
              inputMode="decimal"
              placeholder="-0.13"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
            />
          </div>
          <div className="field field--wide">
            <label htmlFor={ids.name}>Name (optional)</label>
            <input
              id={ids.name}
              className="input"
              placeholder="e.g. Back garden"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
          </div>
          {manualError && (
            <p className="status status--error field--wide" role="alert">
              {manualError}
            </p>
          )}
          <button type="submit" className="button field--wide">
            Use these coordinates
          </button>
        </form>
      </section>
    </div>
  )
}
