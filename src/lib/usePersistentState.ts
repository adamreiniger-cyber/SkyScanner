import { useEffect, useState } from 'react'
import { load, save } from './storage'

/** useState that persists to localStorage under the given key. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial))
  useEffect(() => save(key, value), [key, value])
  return [value, setValue] as const
}
