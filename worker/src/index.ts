/**
 * Proxy CORS pour flux HLS — déployer sur Cloudflare Workers (gratuit).
 * wrangler deploy
 */
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() })
    }

    const requestUrl = new URL(request.url)
    const target = requestUrl.searchParams.get('url')
    if (!target) {
      return new Response('Paramètre url manquant', { status: 400, headers: corsHeaders() })
    }

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
    const ua = request.headers.get('X-Stream-User-Agent')
    const referer = request.headers.get('X-Stream-Referer')
    if (ua) headers.set('User-Agent', ua)
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
        const proxyOrigin = `${requestUrl.protocol}//${requestUrl.host}`
        const rewritten = rewritePlaylist(text, target, proxyOrigin)
        out.set('Content-Type', 'application/vnd.apple.mpegurl')
        return new Response(rewritten, { status: upstream.status, headers: out })
      }

      return new Response(upstream.body, { status: upstream.status, headers: out })
    } catch {
      return new Response('Flux inaccessible', { status: 502, headers: corsHeaders() })
    }
  },
}

function rewritePlaylist(content: string, baseUrl: string, proxyOrigin: string): string {
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

function rewriteTagUris(line: string, base: URL, proxyOrigin: string): string {
  return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
    const absolute = resolveUrl(uri, base)
    return `URI="${proxify(absolute, proxyOrigin)}"`
  })
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

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Stream-User-Agent, X-Stream-Referer, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}
