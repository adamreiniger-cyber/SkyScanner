import { useEffect, useState } from 'react'

type Props = { label: string; onCopy: () => Promise<boolean> }

/** A small button that copies something and says so for a moment. */
export function CopyButton({ label, onCopy }: Props) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')
  useEffect(() => {
    if (state === 'idle') return
    const id = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(id)
  }, [state])

  return (
    <button
      type="button"
      className="copy-button"
      onClick={async () => setState((await onCopy()) ? 'done' : 'failed')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        {state === 'done' ? (
          <path d="M5 12l5 5 9-10" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h8" />
          </>
        )}
      </svg>
      <span aria-live="polite">{state === 'done' ? 'Copied' : state === 'failed' ? 'Couldn’t copy' : label}</span>
    </button>
  )
}
