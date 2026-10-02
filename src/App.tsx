import { useEffect, useState } from 'react'
import WorldMap from './components/WorldMap'
import CountryPanel from './components/CountryPanel'
import SignIn from './components/SignIn'
import { supabase, isConfigured } from './lib/supabase'
import { useSession } from './lib/useSession'
import { countMemoriesByCountry } from './lib/memories'

export default function App() {
  const { session, loading } = useSession()
  const [selected, setSelected] = useState<string | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  // Bumped whenever memories are added or deleted, so the map recolors.
  const [version, setVersion] = useState(0)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let stale = false
    countMemoriesByCountry().then(
      (c) => !stale && setCounts(c),
      (err) => console.error('Could not load visited countries', err),
    )
    return () => {
      stale = true
    }
  }, [userId, version])

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
        <WorldMap selected={selected} counts={counts} onSelect={setSelected} />
        {counts.size > 0 && (
          <div className="visited-badge">
            {counts.size} {counts.size === 1 ? 'country' : 'countries'} visited
          </div>
        )}
        {selected && (
          <CountryPanel
            key={selected}
            country={selected}
            userId={session.user.id}
            onClose={() => setSelected(null)}
            onChanged={() => setVersion((v) => v + 1)}
          />
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
          <button
            className="link sign-out"
            onClick={() => {
              setSelected(null)
              setCounts(new Map())
              supabase.auth.signOut()
            }}
          >
            Sign out
          </button>
        )}
      </header>
      {content}
    </div>
  )
}
