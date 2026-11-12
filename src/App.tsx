import { useEffect } from 'react'
import { NightModeToggle } from './components/NightModeToggle'
import { usePersistentState } from './lib/usePersistentState'
import { SCREENS, type ScreenId } from './screens/screens'
import { EquipmentScreen } from './screens/equipment/EquipmentScreen'
import { LocationScreen } from './screens/location/LocationScreen'
import { SkyScreen } from './screens/sky/SkyScreen'
import { TargetsScreen } from './screens/targets/TargetsScreen'

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

      <main className="screen" aria-labelledby={current.id === 'targets' ? undefined : 'screen-title'} aria-label={current.id === 'targets' ? 'Targets' : undefined}>
        {current.id === 'targets' && <TargetsScreen onNavigate={setScreen} />}
        {current.id === 'location' && <LocationScreen />}
        {current.id === 'sky' && <SkyScreen />}
        {current.id === 'equipment' && <EquipmentScreen onDone={() => setScreen('targets')} />}
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
