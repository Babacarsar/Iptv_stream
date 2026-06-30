import type { Stream } from '@/types'

const TRANSCODE_BASE = import.meta.env.DEV
  ? '/transcode'
  : (import.meta.env.VITE_TRANSCODE_URL as string | undefined)

export function isTranscodeConfigured(): boolean {
  return import.meta.env.DEV || Boolean(TRANSCODE_BASE)
}

interface StartResponse {
  id: string
  playlistUrl: string
  ready: boolean
  error: string | null
}

interface StatusResponse {
  ready: boolean
  error: string | null
  playlistUrl: string
}

export async function checkTranscodeServer(): Promise<boolean> {
  if (!isTranscodeConfigured() || !TRANSCODE_BASE) return false

  try {
    const res = await fetch(`${TRANSCODE_BASE}/api/health`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return false
    const data = (await res.json()) as { ok: boolean; ffmpeg: boolean }
    return data.ok && data.ffmpeg
  } catch {
    return false
  }
}

export async function startTranscode(
  stream: Stream,
  onProgress?: (message: string) => void,
): Promise<string> {
  if (!TRANSCODE_BASE) {
    throw new Error('Transcodage non configuré')
  }

  onProgress?.('Connexion au serveur de transcodage…')

  const res = await fetch(`${TRANSCODE_BASE}/api/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: stream.url,
      referrer: stream.referrer,
      userAgent: stream.userAgent,
    }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Serveur de transcodage indisponible')
  }

  const session = (await res.json()) as StartResponse
  const playlistUrl = `${TRANSCODE_BASE}${session.playlistUrl}`

  if (session.ready) return playlistUrl

  onProgress?.('Encodage en 360p en cours…')

  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(500)

    const statusRes = await fetch(`${TRANSCODE_BASE}/api/${session.id}/status`)
    if (!statusRes.ok) continue

    const status = (await statusRes.json()) as StatusResponse
    if (status.error) throw new Error(status.error)
    if (status.ready) return playlistUrl
  }

  throw new Error('Le transcodage prend trop de temps — réessayez ou changez de chaîne.')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
