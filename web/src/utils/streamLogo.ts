import type { Stream } from '@/types'

export function getStreamLogo(stream: Stream, logoMap: Map<string, string>): string | undefined {
  if (stream.logo) return stream.logo
  if (!stream.tvgId) return undefined
  return logoMap.get(stream.tvgId.split('@')[0])
}
