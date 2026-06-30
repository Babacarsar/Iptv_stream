const PROXY_BASE = (import.meta.env.VITE_STREAM_PROXY as string | undefined)?.replace(/\/$/, '')

export function isStreamProxyEnabled(): boolean {
  return Boolean(PROXY_BASE)
}

export function proxifyStreamUrl(url: string): string {
  if (!PROXY_BASE) return url
  return `${PROXY_BASE}?url=${encodeURIComponent(url)}`
}
