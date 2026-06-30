import type { Stream } from '@/types'

export const MAX_STREAM_HEIGHT = 360

const PROXY_ENABLED = Boolean(import.meta.env.VITE_STREAM_PROXY)

const QUALITY_RANK: Record<string, number> = {
  '144p': 1,
  '240p': 2,
  '288p': 3,
  '360p': 4,
  '480p': 5,
  '576p': 6,
  '720p': 7,
  '1080p': 8,
  '144i': 1,
  '576i': 6,
}

function qualityRank(stream: Stream): number {
  if (stream.quality) {
    const rank = QUALITY_RANK[stream.quality.toLowerCase()]
    if (rank) return rank
  }

  const match = stream.title.match(/\((\d+[pi])\)/i)
  if (match) {
    const rank = QUALITY_RANK[match[1].toLowerCase()]
    if (rank) return rank
  }

  return 99
}

function isHttps(url: string): boolean {
  return url.startsWith('https://')
}

function isKnownBadHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('push2stream.com') || host.includes('pro-fhi.net')
  } catch {
    return false
  }
}

function streamScore(stream: Stream): number {
  const rank = qualityRank(stream)
  let score = 100 - rank

  if (PROXY_ENABLED) {
    // Avec proxy : les flux HTTP sénégalais (69.64.57.208) sont les seuls fiables
    if (isHttps(stream.url)) score += 10
    else score += 60
  } else if (isHttps(stream.url)) {
    score += 50
  } else {
    score -= 100
  }

  if (isKnownBadHost(stream.url)) score -= 80

  const label = stream.label?.toLowerCase() ?? ''
  if (label.includes('geo')) score -= 50
  if (label.includes('not 24')) score -= 5

  return score
}

/** Une entrée par chaîne avec URLs de secours triées par pertinence. */
export function pickLightestStreams(streams: Stream[]): Stream[] {
  const groups = new Map<string, Stream[]>()

  for (const stream of streams) {
    const key = stream.tvgId ?? stream.title
    const list = groups.get(key) ?? []
    list.push(stream)
    groups.set(key, list)
  }

  const result: Stream[] = []

  for (const variants of groups.values()) {
    const sorted = [...variants].sort((a, b) => streamScore(b) - streamScore(a))
    const [primary, ...rest] = sorted
    result.push({
      ...primary,
      alternates: rest.map((s) => s.url),
    })
  }

  return result.sort((a, b) => a.title.localeCompare(b.title))
}
