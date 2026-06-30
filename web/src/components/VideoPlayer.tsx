import { useEffect, useRef } from 'react'
import Hls, { type HlsConfig } from 'hls.js'
import { MAX_STREAM_HEIGHT } from '@/utils/streamPicker'

interface VideoPlayerProps {
  url: string
  referrer?: string
  userAgent?: string
  title: string
  onError?: (message: string) => void
  transcoded?: boolean
}

function capHlsToMaxHeight(hls: Hls, maxHeight: number): number {
  const levels = hls.levels
  if (!levels.length) return -1

  let bestIndex = 0
  let bestHeight = levels[0].height || 0

  for (let i = 0; i < levels.length; i++) {
    const height = levels[i].height || 0
    if (height <= maxHeight && height >= bestHeight) {
      bestIndex = i
      bestHeight = height
    }
  }

  const has360OrLess = levels.some((l) => (l.height || 0) <= maxHeight)
  if (!has360OrLess) {
    bestIndex = 0
    bestHeight = levels[0].height || 0
    for (let i = 1; i < levels.length; i++) {
      const height = levels[i].height || 0
      if (height < bestHeight) {
        bestIndex = i
        bestHeight = height
      }
    }
  }

  hls.autoLevelCapping = bestIndex
  hls.currentLevel = bestIndex
  return bestHeight
}

function createSmoothHlsConfig(referrer?: string, userAgent?: string): Partial<HlsConfig> {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    startLevel: 0,
    capLevelToPlayerSize: true,
    maxBufferLength: 40,
    maxMaxBufferLength: 80,
    backBufferLength: 30,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    startFragPrefetch: true,
    testBandwidth: true,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 10,
    maxLiveSyncPlaybackRate: 1.25,
    fragLoadingMaxRetry: 8,
    fragLoadingRetryDelay: 500,
    manifestLoadingMaxRetry: 6,
    manifestLoadingRetryDelay: 500,
    levelLoadingMaxRetry: 6,
    levelLoadingRetryDelay: 500,
    xhrSetup(xhr) {
      if (referrer) xhr.setRequestHeader('Referer', referrer)
      if (userAgent) xhr.setRequestHeader('User-Agent', userAgent)
    },
  }
}

export function VideoPlayer({ url, referrer, userAgent, title, onError, transcoded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const onErrorRef = useRef(onError)

  onErrorRef.current = onError

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    let cancelled = false

    const cleanup = () => {
      cancelled = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.pause()
      video.removeAttribute('src')
      video.load()
    }

    const isHls = url.includes('.m3u8') || url.includes('.m3u')

    if (isHls && Hls.isSupported()) {
      const hls = new Hls(createSmoothHlsConfig(referrer, userAgent))
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return
        if (!transcoded) capHlsToMaxHeight(hls, MAX_STREAM_HEIGHT)
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (cancelled) return

        if (!data.fatal) return

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError()
            break
          default:
            onErrorRef.current?.('Impossible de lire ce flux.')
            cleanup()
            break
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
    } else {
      video.src = url
      video.play().catch(() => {
        onErrorRef.current?.('Format non supporté par votre navigateur.')
      })
    }

    return cleanup
  }, [url, referrer, userAgent, transcoded])

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        preload="auto"
        title={title}
      />
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />
        <span className="text-sm font-medium">EN DIRECT</span>
      </div>
      <div className="absolute top-4 right-4 px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-xs font-medium pointer-events-none">
        {transcoded ? '360p transcodé' : `max ${MAX_STREAM_HEIGHT}p`}
      </div>
    </div>
  )
}
