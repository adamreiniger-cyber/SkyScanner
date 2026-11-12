import { EQUIPMENT, findEquipment, type Equipment, type EquipmentKind } from '../../lib/equipment'
import { DEFAULT_EQUIPMENT_ID, KEYS } from '../../lib/settings'
import { usePersistentState } from '../../lib/usePersistentState'
import '../settings.css'

const GROUPS: { kind: EquipmentKind; title: string }[] = [
  { kind: 'smart-telescope', title: 'Smart telescopes' },
  { kind: 'binoculars', title: 'Binoculars' },
  { kind: 'visual-telescope', title: 'Visual telescopes' },
]

function fovText(e: Equipment): string {
  const r = (v: number) => Math.round(v * 100) / 100
  return e.fov.round ? `${r(e.fov.w)}° field` : `${r(e.fov.w)}° × ${r(e.fov.h)}° field`
}

function summary(e: Equipment): string {
  const parts = [`${e.apertureMm} mm`, fovText(e)]
  if (e.magnification) parts.push(`${e.magnification}×`)
  if (e.dualBandFilter) parts.push(`built-in ${e.dualBandFilter}`)
  return parts.join(' · ')
}

type Props = { onDone?: () => void }

export function EquipmentScreen({ onDone }: Props) {
  const [kitId, setKitId] = usePersistentState(KEYS.equipment, DEFAULT_EQUIPMENT_ID)
  const kit = findEquipment(kitId)

  return (
    <div className="settings">
      <h2 id="screen-title">Equipment</h2>

      <section className="card current" aria-labelledby="h-kit-current">
        <h3 id="h-kit-current" className="current__label">
          Using
        </h3>
        <p className="current__name">{kit.name}</p>
        <p className="muted small">{summary(kit)}</p>
        {onDone && (
          <button type="button" className="button button--primary" onClick={onDone}>
            See tonight’s targets
          </button>
        )}
      </section>

      {GROUPS.map((g) => {
        const items = EQUIPMENT.filter((e) => e.kind === g.kind)
        if (!items.length) return null
        return (
          <fieldset key={g.kind} className="card">
            <legend>
              <h3>{g.title}</h3>
            </legend>
            <div className="choices choices--grid">
              {items.map((e) => (
                <label key={e.id} className="choice choice--radio">
                  <input type="radio" name="equipment" value={e.id} checked={kit.id === e.id} onChange={() => setKitId(e.id)} />
                  <span className="choice__title">{e.name}</span>
                  <span className="choice__hint">{summary(e)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
