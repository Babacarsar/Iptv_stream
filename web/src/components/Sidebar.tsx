import { Globe, LayoutGrid, X } from 'lucide-react'
import type { Category, Country } from '@/types'

interface SidebarProps {
  countries: Country[]
  categories: Category[]
  activeType: 'country' | 'category'
  activeId: string
  mobileOpen: boolean
  onMobileClose: () => void
  onSelectCountry: (code: string) => void
  onSelectCategory: (id: string) => void
}

export function Sidebar({
  countries,
  categories,
  activeType,
  activeId,
  mobileOpen,
  onMobileClose,
  onSelectCountry,
  onSelectCategory,
}: SidebarProps) {
  const handleCountry = (code: string) => {
    onSelectCountry(code)
    onMobileClose()
  }

  const handleCategory = (id: string) => {
    onSelectCategory(id)
    onMobileClose()
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[88vw] lg:w-64 shrink-0
          flex flex-col border-r border-border bg-surface-raised h-full overflow-hidden
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
          <span className="text-sm font-semibold">Navigation</span>
          <button
            type="button"
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-surface-overlay transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border hidden lg:block">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Pays
          </h2>
        </div>
        <div className="px-4 pt-3 pb-1 lg:hidden">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Pays
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleCountry(country.code)}
              className={`
                w-full text-left px-3 py-2.5 lg:py-2 rounded-lg text-sm transition-colors
                ${activeType === 'country' && activeId === country.code.toLowerCase()
                  ? 'bg-accent text-white font-medium'
                  : 'hover:bg-surface-overlay text-gray-300'}
              `}
            >
              <span className="mr-2">{country.flag}</span>
              {country.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2 mb-2">
            <LayoutGrid className="w-3.5 h-3.5" />
            Catégories
          </h2>
          <div className="max-h-40 lg:max-h-48 overflow-y-auto space-y-0.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategory(cat.id)}
                className={`
                  w-full text-left px-3 py-2.5 lg:py-2 rounded-lg text-sm transition-colors
                  ${activeType === 'category' && activeId === cat.id
                    ? 'bg-accent text-white font-medium'
                    : 'hover:bg-surface-overlay text-gray-300'}
                `}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
