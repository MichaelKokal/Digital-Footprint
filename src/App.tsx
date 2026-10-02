import { useState } from 'react'
import WorldMap from './components/WorldMap'
import CountryPanel from './components/CountryPanel'
import SignIn from './components/SignIn'
import { supabase, isConfigured } from './lib/supabase'
import { useSession } from './lib/useSession'

export default function App() {
  const { session, loading } = useSession()
  const [selected, setSelected] = useState<string | null>(null)

  let content
  if (!isConfigured) {
    content = (
      <div className="notice">
        Supabase isn't connected yet. Copy <code>.env.example</code> to{' '}
        <code>.env.local</code>, fill in your project's values, and restart the dev server.
      </div>
    )
  } else if (loading) {
    content = <div className="notice">Loading…</div>
  } else if (!session) {
    content = <SignIn />
  } else {
    content = (
      <main className="map-area">
        <WorldMap selected={selected} onSelect={setSelected} />
        {selected && (
          <CountryPanel country={selected} onClose={() => setSelected(null)} />
        )}
      </main>
    )
  }

  return (
    <div className="app">
      <header className="top-bar">
        <h1>Digital Footprint</h1>
        <p>Click a country to see your memories there.</p>
        {session && (
          <button className="link sign-out" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        )}
      </header>
      {content}
    </div>
  )
}
