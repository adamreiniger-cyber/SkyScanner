import { useEffect, useRef, useState } from 'react'

/**
 * Run an async loader whenever `key` changes, cancelling the previous one.
 * The loader must never throw: network helpers here resolve to null on failure.
 * Returns undefined while loading, then the loader's result.
 */
export function useRemote<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): T | undefined {
  const [state, setState] = useState<{ key: string | null; value: T | undefined }>({ key: null, value: undefined })
  // Only `key` triggers a reload; the latest loader is read from a ref.
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (key == null) return
    const controller = new AbortController()
    loadRef.current(controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) setState({ key, value })
      },
      () => {
        // Loaders shouldn't reject, but if one does, stay on the fallback.
      },
    )
    return () => controller.abort()
  }, [key])

  return state.key === key ? state.value : undefined
}
