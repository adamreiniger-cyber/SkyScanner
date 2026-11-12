/**
 * Small typed wrapper around localStorage that never throws.
 * localStorage can be missing or blocked (private mode, disabled cookies),
 * so every read and write is guarded and falls back to the default.
 */
const PREFIX = 'skyshot:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable or full: settings just won't persist this session.
  }
}
