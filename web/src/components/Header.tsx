import { Link } from 'react-router-dom'
import { Menu, Play } from 'lucide-react'

interface HeaderProps {
  onMenuOpen?: () => void
}

export function Header({ onMenuOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-surface/90 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuOpen}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-surface-overlay transition-colors shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent flex items-center justify-center group-hover:bg-accent-hover transition-colors shrink-0">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">Babacar Streaming</h1>
            <p className="text-[10px] sm:text-[11px] text-muted -mt-0.5 truncate hidden sm:block">
              Chaînes du monde entier
            </p>
          </div>
        </Link>
      </div>

      <div className="text-xs sm:text-sm text-muted shrink-0 hidden sm:block">
        <span>Powered by Babacar</span>
      </div>
    </header>
  )
}
