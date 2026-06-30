import type { Stream } from '@/types'

export const MAX_STREAM_HEIGHT = 360

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

function streamScore(stream: Stream): number {
  const rank = qualityRank(stream)
  let score = 100 - rank

  // Sur GitHub Pages (HTTPS), les flux http:// sont bloqués par le navigateur
  if (isHttps(stream.url)) score += 100
  else score -= 100

  const label = stream.label?.toLowerCase() ?? ''
  if (label.includes('geo')) score -= 50
  if (label.includes('not 24')) score -= 5

  return score
}

/** Garde une source par chaîne : HTTPS prioritaire, puis qualité la plus légère. */
export function pickLightestStreams(streams: Stream[]): Stream[] {
  const byChannel = new Map<string, Stream>()

  for (const stream of streams) {
    const key = stream.tvgId ?? stream.title
    const existing = byChannel.get(key)

    if (!existing || streamScore(stream) > streamScore(existing)) {
      byChannel.set(key, stream)
    }
  }

  return Array.from(byChannel.values()).sort((a, b) => a.title.localeCompare(b.title))
}
