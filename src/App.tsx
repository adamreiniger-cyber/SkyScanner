import { useEffect } from 'react'
import { NightModeToggle } from './components/NightModeToggle'
import { usePersistentState } from './lib/usePersistentState'
import { SCREENS, type ScreenId } from './screens/screens'

export default function App() {
  const [screen, setScreen] = usePersistentState<ScreenId>('screen', 'targets')
  const [night, setNight] = usePersistentState('nightMode', false)

  // Red night mode is a token swap on the root element, not a CSS filter.
  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'dark'
  }, [night])

  const current = SCREENS.find((s) => s.id === screen) ?? SCREENS[0]

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="brand">SkyShot</h1>
        <NightModeToggle on={night} onChange={setNight} />
      </header>

      <main className="screen" aria-labelledby="screen-title">
        <h2 id="screen-title">{current.label}</h2>
        <p className="muted">{current.blurb}</p>
        <p className="muted small">The redesign is in progress. This screen is a placeholder.</p>
      </main>

      <nav className="tabbar" aria-label="Main">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="tab"
            aria-current={s.id === current.id ? 'page' : undefined}
            onClick={() => setScreen(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
