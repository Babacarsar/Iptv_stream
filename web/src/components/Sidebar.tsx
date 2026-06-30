import { Globe, LayoutGrid } from 'lucide-react'
import type { Category, Country } from '@/types'

interface SidebarProps {
  countries: Country[]
  categories: Category[]
  activeType: 'country' | 'category'
  activeId: string
  onSelectCountry: (code: string) => void
  onSelectCategory: (id: string) => void
}

export function Sidebar({
  countries,
  categories,
  activeType,
  activeId,
  onSelectCountry,
  onSelectCategory,
}: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-border bg-surface-raised h-full overflow-hidden">
      <div className="p-4 border-b border-border">
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
              onClick={() => onSelectCountry(country.code)}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
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
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
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
  )
}
