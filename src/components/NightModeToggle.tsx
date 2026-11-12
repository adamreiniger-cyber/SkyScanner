type Props = { on: boolean; onChange: (on: boolean) => void }

export function NightModeToggle({ on, onChange }: Props) {
  return (
    <button
      type="button"
      className="night-toggle"
      aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      {on ? 'Red night mode: on' : 'Red night mode: off'}
    </button>
  )
}
