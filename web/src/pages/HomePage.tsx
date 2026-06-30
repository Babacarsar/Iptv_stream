import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2, Radio } from 'lucide-react'
import { ChannelGrid } from '@/components/ChannelGrid'
import { Header } from '@/components/Header'
import { SearchBar } from '@/components/SearchBar'
import { Sidebar } from '@/components/Sidebar'
import { TranscodedPlayer, TranscodeUnavailable } from '@/components/TranscodedPlayer'
import { VideoPlayer } from '@/components/VideoPlayer'
import { useCatalog } from '@/context/CatalogContext'
import { usePlaylist } from '@/hooks/useCatalog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchStreams } from '@/services/api'
import { checkTranscodeServer, isTranscodeConfigured } from '@/services/transcode'
import { isStreamProxyEnabled } from '@/utils/streamProxy'
import type { Stream } from '@/types'

export function HomePage() {
  const { countries, categories, logoMap, error: catalogError } = useCatalog()

  const [activeType, setActiveType] = useState<'country' | 'category'>('country')
  const [activeId, setActiveId] = useState('sn')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [selected, setSelected] = useState<Stream | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const transcodeConfigured = isTranscodeConfigured()
  const [transcodeAvailable, setTranscodeAvailable] = useState<boolean | null>(
    transcodeConfigured ? null : false,
  )
  const [useDirectStream, setUseDirectStream] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!transcodeConfigured) return
    checkTranscodeServer().then(setTranscodeAvailable)
  }, [transcodeConfigured])

  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [sidebarOpen])

  const source = useMemo(
    () => (activeId ? { type: activeType, id: activeId } : null),
    [activeType, activeId],
  )

  const { streams, loading: playlistLoading, error: playlistError } = usePlaylist(source)

  const filtered = useMemo(() => searchStreams(streams, debouncedSearch), [streams, debouncedSearch])

  const activeLabel =
    activeType === 'country'
      ? countries.find((c) => c.code.toLowerCase() === activeId)?.name ?? activeId.toUpperCase()
      : categories.find((c) => c.id === activeId)?.name ?? activeId

  const needsSenegalProxy =
    activeType === 'country' &&
    activeId === 'sn' &&
    !import.meta.env.DEV &&
    !isStreamProxyEnabled()

  const handleSelectCountry = (code: string) => {
    setActiveType('country')
    setActiveId(code.toLowerCase())
    setSelected(null)
    setPlayerError(null)
  }

  const handleSelectCategory = (id: string) => {
    setActiveType('category')
    setActiveId(id)
    setSelected(null)
    setPlayerError(null)
  }

  const handleSelectStream = (stream: Stream) => {
    if (selected?.url === stream.url) return
    setSelected(stream)
    setPlayerError(null)
    if (window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  if (catalogError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erreur de connexion</h2>
          <p className="text-muted">{catalogError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onMenuOpen={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar
          countries={countries}
          categories={categories}
          activeType={activeType}
          activeId={activeId}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          onSelectCountry={handleSelectCountry}
          onSelectCategory={handleSelectCategory}
        />

        <main className="flex-1 overflow-y-auto min-w-0">
          <section ref={playerRef} className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            {selected ? (
              <div className="max-w-5xl mx-auto">
                {transcodeAvailable === null ? (
                  <div className="aspect-video flex items-center justify-center bg-black rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : transcodeAvailable && !useDirectStream ? (
                  <TranscodedPlayer stream={selected} onError={setPlayerError} />
                ) : (
                  <>
                    {transcodeConfigured && transcodeAvailable === false && (
                      <div className="mb-4">
                        <TranscodeUnavailable message="Transcodage indisponible — lecture directe activée." />
                      </div>
                    )}
                    <VideoPlayer
                      key={selected.id}
                      url={selected.url}
                      alternateUrls={selected.alternates}
                      referrer={selected.referrer}
                      userAgent={selected.userAgent}
                      title={selected.title}
                      onError={setPlayerError}
                    />
                  </>
                )}
                {transcodeConfigured && transcodeAvailable && (
                  <button
                    type="button"
                    onClick={() => setUseDirectStream((v) => !v)}
                    className="mt-2 text-xs text-muted hover:text-white transition-colors"
                  >
                    {useDirectStream ? '↩ Revenir au transcodage 360p' : '→ Lecture directe (sans transcodage)'}
                  </button>
                )}
                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold truncate">{selected.title}</h2>
                    <p className="text-muted text-sm mt-1">{selected.groupTitle}</p>
                    {selected.label && (
                      <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300">
                        {selected.label}
                      </span>
                    )}
                  </div>
                  {selected.quality && (
                    <span className="shrink-0 px-3 py-1 rounded-full bg-surface-overlay text-sm font-medium border border-border">
                      {selected.quality}
                    </span>
                  )}
                </div>
                {playerError && (
                  <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {playerError}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-5xl mx-auto rounded-xl bg-gradient-to-br from-surface-overlay to-surface-raised border border-border p-8 sm:p-12 text-center">
                <Radio className="w-12 h-12 sm:w-16 sm:h-16 text-accent mx-auto mb-4 opacity-80" />
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Bienvenue sur Babacar Streaming</h2>
                <p className="text-muted max-w-lg mx-auto">
                  Sélectionnez une chaîne pour démarrer la lecture instantanément.
                </p>
              </div>
            )}
          </section>

          <section className="px-4 sm:px-6 pb-6 sm:pb-8">
            {needsSenegalProxy && (
              <div className="mb-6 max-w-3xl p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm">
                <p className="font-medium mb-1">Chaînes sénégalaises (RTS, TFM, 2STV…)</p>
                <p className="text-amber-200/90">
                  Ces flux sont en HTTP. Le proxy Cloudflare Workers est bloqué par le serveur SN — utilisez le
                  proxy Express (<code className="text-xs">server/</code>) déployé sur Render ou un tunnel.
                  Secret GitHub : <code className="text-xs">VITE_STREAM_PROXY</code>.
                  En local : <code className="text-xs">npm run dev:all</code>.
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {activeLabel}
                  <span className="text-sm font-normal text-muted">
                    ({filtered.length} chaîne{filtered.length !== 1 ? 's' : ''})
                  </span>
                </h3>
              </div>
              <div className="w-full sm:w-72">
                <SearchBar value={search} onChange={setSearch} />
              </div>
            </div>

            {playlistLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : playlistError ? (
              <div className="text-center py-12 text-muted">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                {playlistError}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted">Aucune chaîne trouvée.</div>
            ) : (
              <ChannelGrid
                streams={filtered}
                logoMap={logoMap}
                selectedId={selected?.id ?? null}
                onSelect={handleSelectStream}
              />
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
