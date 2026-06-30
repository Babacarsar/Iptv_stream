import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Stream } from '@/types'
import { ChannelCard } from '@/components/ChannelCard'

const PAGE_SIZE = 36

interface ChannelGridProps {
  streams: Stream[]
  logoMap: Map<string, string>
  selectedId: string | null
  onSelect: (stream: Stream) => void
}

export function ChannelGrid({ streams, logoMap, selectedId, onSelect }: ChannelGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [streams])

  const visible = streams.slice(0, visibleCount)
  const hasMore = visibleCount < streams.length

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {visible.map((stream) => (
          <ChannelCard
            key={stream.id}
            stream={stream}
            logoMap={logoMap}
            active={selectedId === stream.id}
            onClick={() => onSelect(stream)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-surface-overlay border border-border
              text-sm font-medium hover:bg-surface-raised hover:border-accent/50 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
            Afficher plus ({streams.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </>
  )
}
