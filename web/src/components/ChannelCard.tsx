import { memo, useEffect, useRef, useState } from 'react'
import { Tv } from 'lucide-react'
import type { Stream } from '@/types'
import { getStreamLogo } from '@/utils/streamLogo'

interface ChannelCardProps {
  stream: Stream
  logoMap: Map<string, string>
  onClick: () => void
  active?: boolean
}

export const ChannelCard = memo(function ChannelCard({
  stream,
  logoMap,
  onClick,
  active,
}: ChannelCardProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const logo = inView ? getStreamLogo(stream, logoMap) : undefined

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`
        group relative flex flex-col items-center gap-2 p-3 rounded-xl
        transition-all duration-200 cursor-pointer text-left w-full
        hover:bg-surface-overlay hover:scale-[1.03]
        ${active ? 'bg-surface-overlay ring-2 ring-accent' : 'bg-surface-raised'}
      `}
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-overlay flex items-center justify-center">
        {logo ? (
          <img
            src={logo}
            alt={stream.title}
            className="w-full h-full object-contain p-2"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <Tv className="w-10 h-10 text-muted" />
        )}
        {stream.quality && (
          <span className="absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-white">
            {stream.quality}
          </span>
        )}
      </div>
      <div className="w-full min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-white transition-colors">
          {stream.title}
        </p>
        {stream.label && (
          <p className="text-xs text-amber-400 truncate mt-0.5">{stream.label}</p>
        )}
      </div>
    </button>
  )
})
