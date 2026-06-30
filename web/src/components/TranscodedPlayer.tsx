import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { Stream } from '@/types'
import { startTranscode } from '@/services/transcode'
import { VideoPlayer } from '@/components/VideoPlayer'

interface TranscodedPlayerProps {
  stream: Stream
  onError?: (message: string) => void
}

export function TranscodedPlayer({ stream, onError }: TranscodedPlayerProps) {
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusText, setStatusText] = useState('Préparation du flux 360p…')
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    let cancelled = false

    async function prepare() {
      setLoading(true)
      setPlaylistUrl(null)
      setStatusText('Préparation du flux 360p…')

      try {
        const url = await startTranscode(stream, (msg) => {
          if (!cancelled) setStatusText(msg)
        })
        if (!cancelled) {
          setPlaylistUrl(url)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false)
          onErrorRef.current?.(err instanceof Error ? err.message : 'Transcodage impossible')
        }
      }
    }

    prepare()
    return () => {
      cancelled = true
    }
  }, [stream.url, stream.referrer, stream.userAgent])

  if (loading || !playlistUrl) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center gap-3 border border-border">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
        <p className="text-sm text-muted">{statusText}</p>
        <p className="text-xs text-muted/70">Transcodage FFmpeg → 360p</p>
      </div>
    )
  }

  return (
    <VideoPlayer
      key={playlistUrl}
      url={playlistUrl}
      title={stream.title}
      onError={onError}
      transcoded
    />
  )
}

export function TranscodeUnavailable({ message }: { message: string }) {
  return (
    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-start gap-2">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      {message}
    </div>
  )
}
