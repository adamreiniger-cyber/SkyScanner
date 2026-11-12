/** Target blurbs from the Wikipedia REST API. Failures resolve to null so the catalogue text is used. */
export function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

export function summaryUrl(title: string): string {
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

export function parseSummary(json: unknown): string | null {
  const extract = (json as { extract?: unknown } | null)?.extract
  return typeof extract === 'string' && extract.trim() ? extract.trim() : null
}

export async function fetchSummary(title: string, signal?: AbortSignal): Promise<string | null> {
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
