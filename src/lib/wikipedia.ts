/** Target blurbs from the Wikipedia REST API. Failures resolve to null so the catalogue text is used. */
export function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

export function summaryUrl(title: string): string {
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

export type WikiImage = { src: string; width: number; height: number }
export type WikiSummary = { text: string | null; image: WikiImage | null }

type RawImage = { source?: unknown; width?: unknown; height?: unknown }

function readImage(raw: RawImage | undefined): WikiImage | null {
  if (!raw || typeof raw.source !== 'string' || !raw.source.startsWith('https://')) return null
  if (typeof raw.width !== 'number' || typeof raw.height !== 'number') return null
  return { src: raw.source, width: raw.width, height: raw.height }
}

/**
 * A photo about `want` pixels wide. The summary's thumbnail is small (about
 * 320 px), so ask Wikimedia for a bigger rendering of it, but never bigger
 * than the original.
 */
export function pickImage(thumb: WikiImage | null, original: WikiImage | null, want = 800): WikiImage | null {
  if (original && original.width <= want) return original
  if (thumb && original && /\/\d+px-[^/]+$/.test(thumb.src)) {
    const scale = want / original.width
    return { src: thumb.src.replace(/\/\d+px-([^/]+)$/, `/${want}px-$1`), width: want, height: Math.round(original.height * scale) }
  }
  return thumb ?? original
}

export function parseSummary(json: unknown): WikiSummary | null {
  if (!json || typeof json !== 'object') return null
  const j = json as { extract?: unknown; thumbnail?: RawImage; originalimage?: RawImage }
  const text = typeof j.extract === 'string' && j.extract.trim() ? j.extract.trim() : null
  const image = pickImage(readImage(j.thumbnail), readImage(j.originalimage))
  return text || image ? { text, image } : null
}

export async function fetchSummary(title: string, signal?: AbortSignal): Promise<WikiSummary | null> {
  try {
    const res = await fetch(summaryUrl(title), { signal })
    if (!res.ok) return null
    return parseSummary(await res.json())
  } catch {
    return null
  }
}

export function stellariumUrl(name: string): string {
  return `https://stellarium-web.org/skysource/${encodeURIComponent(name)}`
}

export function astrobinUrl(name: string): string {
  return `https://www.astrobin.com/search/?q=${encodeURIComponent(name)}`
}
