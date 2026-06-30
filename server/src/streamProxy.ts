const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'X-Stream-User-Agent, X-Stream-Referer, Content-Type',
  'Access-Control-Max-Age': '86400',
}

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS }
}

function resolveUrl(ref: string, base: URL): string {
  try {
    return new URL(ref, base).href
  } catch {
    return ref
  }
}

function proxify(url: string, proxyOrigin: string): string {
  return `${proxyOrigin}?url=${encodeURIComponent(url)}`
}

function rewriteTagUris(line: string, base: URL, proxyOrigin: string): string {
  return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
    const absolute = resolveUrl(uri, base)
    return `URI="${proxify(absolute, proxyOrigin)}"`
  })
}

export function rewritePlaylist(content: string, baseUrl: string, proxyOrigin: string): string {
  const base = new URL(baseUrl)
  const lines = content.split(/\r?\n/)

  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        return rewriteTagUris(line, base, proxyOrigin)
      }
      const absolute = resolveUrl(trimmed, base)
      return proxify(absolute, proxyOrigin)
    })
    .join('\n')
}

export async function proxyStreamRequest(
  proxyOrigin: string,
  target: string,
  requestHeaders: Headers,
): Promise<Response> {
  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('URL invalide', { status: 400, headers: corsHeaders() })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return new Response('Protocole non autorisé', { status: 400, headers: corsHeaders() })
  }

  const headers = new Headers()
  const ua = requestHeaders.get('x-stream-user-agent') ?? requestHeaders.get('X-Stream-User-Agent')
  const referer = requestHeaders.get('x-stream-referer') ?? requestHeaders.get('X-Stream-Referer')
  headers.set(
    'User-Agent',
    ua ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 VLC/3.0.20 LibVLC/3.0.20',
  )
  if (referer) headers.set('Referer', referer)

  try {
    const upstream = await fetch(target, { headers, redirect: 'follow' })

    const out = new Headers(upstream.headers)
    for (const [k, v] of Object.entries(corsHeaders())) {
      out.set(k, v)
    }

    const type = upstream.headers.get('content-type') ?? ''
    const isPlaylist =
      type.includes('mpegurl') ||
      type.includes('m3u') ||
      target.includes('.m3u8') ||
      target.includes('.m3u')

    if (isPlaylist) {
      const text = await upstream.text()
      const rewritten = rewritePlaylist(text, target, proxyOrigin)
      out.set('Content-Type', 'application/vnd.apple.mpegurl')
      return new Response(rewritten, { status: upstream.status, headers: out })
    }

    return new Response(upstream.body, { status: upstream.status, headers: out })
  } catch {
    return new Response('Flux inaccessible', { status: 502, headers: corsHeaders() })
  }
}
