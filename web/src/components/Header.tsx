import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-surface/90 backdrop-blur-md border-b border-border">
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center group-hover:bg-accent-hover transition-colors">
          <Play className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Babacar Streaming</h1>
          <p className="text-[11px] text-muted -mt-0.5">Chaînes du monde entier</p>
        </div>
      </Link>

      <div className="text-sm text-muted">
        <span>Powered by Babacar</span>
      </div>
    </header>
  )
}
