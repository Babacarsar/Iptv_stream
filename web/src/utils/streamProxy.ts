const PROXY_BASE = (import.meta.env.VITE_STREAM_PROXY as string | undefined)?.replace(/\/$/, '')

export function isStreamProxyEnabled(): boolean {
  return Boolean(PROXY_BASE)
}

export function proxifyStreamUrl(url: string): string {
  if (!PROXY_BASE) return url
  const base = PROXY_BASE.replace(/\/$/, '')
  const proxyRoot = base.includes('.workers.dev') ? base : `${base}/proxy`
  return `${proxyRoot}?url=${encodeURIComponent(url)}`
}
