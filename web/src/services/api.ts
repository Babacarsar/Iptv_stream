import type { Category, Channel, Country, Logo, Stream } from '@/types'

const API_BASE = import.meta.env.DEV ? '/api' : 'https://iptv-org.github.io/api'
const IPTV_BASE = import.meta.env.DEV ? '/iptv' : 'https://iptv-org.github.io/iptv'

const cache = new Map<string, unknown>()

async function fetchJson<T>(url: string): Promise<T> {
  const cached = cache.get(url)
  if (cached) return cached as T

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = (await res.json()) as T
  cache.set(url, data)
  return data
}

async function fetchText(url: string): Promise<string> {
  const cached = cache.get(url)
  if (cached) return cached as string

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const data = await res.text()
  cache.set(url, data)
  return data
}

async function fetchPlaylistM3U(urls: string[]): Promise<Stream[]> {
  let lastError: Error | null = null

  for (const url of urls) {
    try {
      const content = await fetchText(url)
      const streams = parseM3U(content)
      if (streams.length > 0) return streams
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError ?? new Error('Playlist introuvable')
}

export async function getCountries(): Promise<Country[]> {
  return fetchJson<Country[]>(`${API_BASE}/countries.json`)
}

export async function getCategories(): Promise<Category[]> {
  return fetchJson<Category[]>(`${API_BASE}/categories.json`)
}

export async function getChannels(): Promise<Channel[]> {
  return fetchJson<Channel[]>(`${API_BASE}/channels.json`)
}

export async function getLogos(): Promise<Logo[]> {
  return fetchJson<Logo[]>(`${API_BASE}/logos.json`)
}

function parseExtInf(line: string): {
  tvgId: string | null
  tvgLogo: string | null
  groupTitle: string
  title: string
} {
  const tvgId = line.match(/tvg-id="([^"]*)"/)?.[1] ?? null
  const tvgLogo = line.match(/tvg-logo="([^"]*)"/)?.[1] ?? null
  const groupTitle = line.match(/group-title="([^"]*)"/)?.[1] ?? 'Autre'
  const title = line.split(',').pop()?.trim() ?? 'Chaîne'

  return { tvgId, tvgLogo, groupTitle, title }
}

function parseQuality(title: string): { cleanTitle: string; quality?: string; label?: string } {
  let cleanTitle = title
  const labelMatch = cleanTitle.match(/ \[(.+)\]$/)
  const label = labelMatch?.[1]
  if (labelMatch) cleanTitle = cleanTitle.replace(/ \[.+]$/, '')

  const qualityMatch = cleanTitle.match(/ \((\d+[pi])\)$/)
  const quality = qualityMatch?.[1]
  if (qualityMatch) cleanTitle = cleanTitle.replace(/ \(\d+[pi]\)$/, '')

  return { cleanTitle, quality, label }
}

export function parseM3U(content: string): Stream[] {
  const lines = content.split(/\r?\n/)
  const streams: Stream[] = []
  let pendingMeta: ReturnType<typeof parseExtInf> | null = null
  let referrer: string | undefined
  let userAgent: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('#EXTVLCOPT:http-referrer=')) {
      referrer = trimmed.replace('#EXTVLCOPT:http-referrer=', '')
      continue
    }
    if (trimmed.startsWith('#EXTVLCOPT:http-user-agent=')) {
      userAgent = trimmed.replace('#EXTVLCOPT:http-user-agent=', '')
      continue
    }
    if (trimmed.startsWith('#EXTINF:')) {
      pendingMeta = parseExtInf(trimmed)
      continue
    }
    if (trimmed.startsWith('#')) continue

    if (pendingMeta && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      const { cleanTitle, quality, label } = parseQuality(pendingMeta.title)
      const id = `${pendingMeta.tvgId ?? cleanTitle}-${streams.length}`

      streams.push({
        id,
        title: cleanTitle,
        url: trimmed,
        tvgId: pendingMeta.tvgId,
        groupTitle: pendingMeta.groupTitle,
        logo: pendingMeta.tvgLogo ?? undefined,
        quality,
        label,
        referrer,
        userAgent,
      })

      pendingMeta = null
      referrer = undefined
      userAgent = undefined
    }
  }

  return streams
}

export async function getPlaylistByCountry(code: string): Promise<Stream[]> {
  const normalized = code.toLowerCase()
  return fetchPlaylistM3U([
    `${IPTV_BASE}/sources/${normalized}.m3u`,
    `${IPTV_BASE}/countries/${normalized}.m3u`,
  ])
}

export async function getPlaylistByCategory(id: string): Promise<Stream[]> {
  const normalized = id.toLowerCase()
  return fetchPlaylistM3U([`${IPTV_BASE}/categories/${normalized}.m3u`])
}

export async function getIndexPlaylist(): Promise<Stream[]> {
  const content = await fetchText(`${IPTV_BASE}/index.m3u`)
  return parseM3U(content)
}

export function buildLogoMap(logos: Logo[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const logo of logos) {
    if (!logo.feed) {
      map.set(logo.channel, logo.url)
    }
  }
  return map
}

export function enrichStreams(streams: Stream[], logoMap: Map<string, string>): Stream[] {
  return streams.map((stream) => {
    if (stream.logo) return stream
    if (!stream.tvgId) return stream

    const channelId = stream.tvgId.split('@')[0]
    const logo = logoMap.get(channelId)
    return logo ? { ...stream, logo } : stream
  })
}

export function searchStreams(streams: Stream[], query: string): Stream[] {
  const q = query.toLowerCase().trim()
  if (!q) return streams

  return streams.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.groupTitle.toLowerCase().includes(q) ||
      (s.tvgId?.toLowerCase().includes(q) ?? false),
  )
}

export function groupStreamsByCategory(streams: Stream[]): Map<string, Stream[]> {
  const groups = new Map<string, Stream[]>()
  for (const stream of streams) {
    const key = stream.groupTitle || 'Autre'
    const list = groups.get(key) ?? []
    list.push(stream)
    groups.set(key, list)
  }
  return groups
}
