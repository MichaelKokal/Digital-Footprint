import { useState } from 'react'
import WorldMap from './components/WorldMap'
import CountryPanel from './components/CountryPanel'

export default function App() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="app">
      <header className="top-bar">
        <h1>Digital Footprint</h1>
        <p>Click a country to see your memories there.</p>
      </header>
      <main className="map-area">
        <WorldMap selected={selected} onSelect={setSelected} />
        {selected && (
          <CountryPanel country={selected} onClose={() => setSelected(null)} />
        )}
      </main>
    </div>
  )
}
