import { useCallback, useEffect, useState } from 'react'
import type { Category, Country, Logo, Stream } from '@/types'
import {
  buildLogoMap,
  getCategories,
  getLogos,
  getPlaylistByCategory,
  getPlaylistByCountry,
} from '@/services/api'
import { FEATURED_COUNTRIES } from '@/constants/countries'
import { pickLightestStreams } from '@/utils/streamPicker'

interface CatalogState {
  countries: Country[]
  categories: Category[]
  logoMap: Map<string, string>
  loading: boolean
  error: string | null
}

export function useCatalog() {
  const [state, setState] = useState<CatalogState>({
    countries: [],
    categories: [],
    logoMap: new Map(),
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const categories = await getCategories()

        if (cancelled) return

        setState({
          countries: FEATURED_COUNTRIES,
          categories: categories.sort((a, b) => a.name.localeCompare(b.name)),
          logoMap: new Map(),
          loading: false,
          error: null,
        })

        getLogos()
          .then((logos) => {
            if (cancelled) return
            setState((prev) => ({
              ...prev,
              logoMap: buildLogoMap(logos as Logo[]),
            }))
          })
          .catch(() => {})
      } catch (err) {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Erreur de chargement',
        }))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export function usePlaylist(source: { type: 'country' | 'category'; id: string } | null) {
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!source) {
      setStreams([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const raw =
        source.type === 'country'
          ? await getPlaylistByCountry(source.id)
          : await getPlaylistByCategory(source.id)

      setStreams(pickLightestStreams(raw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      setStreams([])
    } finally {
      setLoading(false)
    }
  }, [source])

  useEffect(() => {
    load()
  }, [load])

  return { streams, loading, error, reload: load }
}
