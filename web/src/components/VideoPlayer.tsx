import { useEffect, useMemo, useRef, useState } from 'react'
import Hls, { type HlsConfig } from 'hls.js'
import { MAX_STREAM_HEIGHT } from '@/utils/streamPicker'
import { isStreamProxyEnabled, proxifyStreamUrl } from '@/utils/streamProxy'

interface VideoPlayerProps {
  url: string
  alternateUrls?: string[]
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
  const useProxy = isStreamProxyEnabled()

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
    fragLoadingMaxRetry: 6,
    fragLoadingRetryDelay: 500,
    manifestLoadingMaxRetry: 4,
    manifestLoadingRetryDelay: 500,
    levelLoadingMaxRetry: 4,
    levelLoadingRetryDelay: 500,
    xhrSetup(xhr, url) {
      if (useProxy) {
        if (userAgent) xhr.setRequestHeader('X-Stream-User-Agent', userAgent)
        if (referrer) xhr.setRequestHeader('X-Stream-Referer', referrer)
      } else {
        if (referrer) xhr.setRequestHeader('Referer', referrer)
        if (userAgent) xhr.setRequestHeader('User-Agent', userAgent)
      }
      void url
    },
  }
}

export function VideoPlayer({
  url,
  alternateUrls = [],
  referrer,
  userAgent,
  title,
  onError,
  transcoded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const onErrorRef = useRef(onError)
  const [urlIndex, setUrlIndex] = useState(0)

  const allUrls = useMemo(() => [url, ...alternateUrls], [url, alternateUrls])
  const currentUrl = allUrls[urlIndex] ?? url

  onErrorRef.current = onError

  useEffect(() => {
    setUrlIndex(0)
  }, [url, alternateUrls])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentUrl) return

    let cancelled = false
    let networkRetries = 0

    const useProxy = isStreamProxyEnabled()
    if (window.location.protocol === 'https:' && currentUrl.startsWith('http://') && !useProxy) {
      if (urlIndex < allUrls.length - 1) {
        setUrlIndex((i) => i + 1)
        return
      }
      onErrorRef.current?.(
        'Flux HTTP bloqué sur ce site. Déployez le proxy Cloudflare (dossier worker/) puis configurez VITE_STREAM_PROXY.',
      )
      return
    }

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

    const tryNextSource = () => {
      if (urlIndex < allUrls.length - 1) {
        setUrlIndex((i) => i + 1)
        return true
      }
      return false
    }

    const isHls = currentUrl.includes('.m3u8') || currentUrl.includes('.m3u')
    const playUrl = useProxy ? proxifyStreamUrl(currentUrl) : currentUrl

    if (isHls && Hls.isSupported()) {
      const hls = new Hls(createSmoothHlsConfig(referrer, userAgent))
      hlsRef.current = hls
      hls.loadSource(playUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return
        networkRetries = 0
        if (!transcoded) capHlsToMaxHeight(hls, MAX_STREAM_HEIGHT)
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (cancelled || !data.fatal) return

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (networkRetries < 2) {
              networkRetries++
              hls.startLoad()
            } else if (!tryNextSource()) {
              onErrorRef.current?.('Flux inaccessible — essayez une autre chaîne.')
              cleanup()
            }
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError()
            break
          default:
            if (!tryNextSource()) {
              onErrorRef.current?.('Impossible de lire ce flux.')
              cleanup()
            }
            break
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playUrl
      video.play().catch(() => {
        if (!tryNextSource()) onErrorRef.current?.('Lecture impossible.')
      })
    } else {
      video.src = playUrl
      video.play().catch(() => {
        if (!tryNextSource()) onErrorRef.current?.('Format non supporté.')
      })
    }

    return cleanup
  }, [currentUrl, urlIndex, allUrls.length, referrer, userAgent, transcoded])

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-2xl">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        preload="auto"
        title={title}
      />
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/70 backdrop-blur-sm pointer-events-none">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 live-dot" />
        <span className="text-xs sm:text-sm font-medium">EN DIRECT</span>
      </div>
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-black/70 backdrop-blur-sm text-[10px] sm:text-xs font-medium pointer-events-none max-w-[45%] truncate">
        {transcoded ? '360p transcodé' : `max ${MAX_STREAM_HEIGHT}p`}
        {allUrls.length > 1 && urlIndex > 0 ? ` · source ${urlIndex + 1}` : ''}
      </div>
    </div>
  )
}
