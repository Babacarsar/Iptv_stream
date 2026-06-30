import { createContext, useContext, type ReactNode } from 'react'
import type { Category, Country } from '@/types'
import { useCatalog as useCatalogData } from '@/hooks/useCatalog'

interface CatalogContextValue {
  countries: Country[]
  categories: Category[]
  logoMap: Map<string, string>
  loading: boolean
  error: string | null
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const value = useCatalogData()
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
