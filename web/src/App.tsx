import { Routes, Route } from 'react-router-dom'
import { CatalogProvider } from '@/context/CatalogContext'
import { HomePage } from '@/pages/HomePage'

export default function App() {
  return (
    <CatalogProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:type/:id" element={<HomePage />} />
      </Routes>
    </CatalogProvider>
  )
}
