import { useEffect, useMemo, useState } from 'react'
import EarthGlobe, { type GlobeClick } from './components/EarthGlobe'
import CountryPanel from './components/CountryPanel'
import SignIn from './components/SignIn'
import { supabase, isConfigured } from './lib/supabase'
import { useSession } from './lib/useSession'
import { listPins, type Pin } from './lib/memories'
import { isPhoneLayout } from './lib/device'

export default function App() {
  const { session, loading } = useSession()
  const [selected, setSelected] = useState<GlobeClick | null>(null)
  // The memory to scroll to when a pin is clicked.
  const [focusMemoryId, setFocusMemoryId] = useState<string | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  // Bumped whenever memories are added or deleted, so the globe recolors.
  const [version, setVersion] = useState(0)
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let stale = false
    listPins().then(
      (p) => !stale && setPins(p),
      (err) => console.error('Could not load memory pins', err),
    )
    return () => {
      stale = true
    }
  }, [userId, version])

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const p of pins) c.set(p.country, (c.get(p.country) ?? 0) + 1)
    return c
  }, [pins])

  function selectCountry(click: GlobeClick) {
    setSelected(click)
    setFocusMemoryId(null)
  }

  function selectPin(pin: Pin) {
    setSelected({ country: pin.country, lat: pin.lat, lng: pin.lng })
    setFocusMemoryId(pin.id)
  }

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
        <EarthGlobe
          selected={selected?.country ?? null}
          focus={selected}
          counts={counts}
          pins={pins}
          activePinId={focusMemoryId}
          onSelect={selectCountry}
          onPinClick={selectPin}
          // On phones the panel covers much of the screen, so tapping
          // the ocean is a quick way to close it.
          onOceanClick={() => isPhoneLayout() && setSelected(null)}
        />
        {counts.size > 0 && (
          <div className="visited-badge">
            {counts.size} {counts.size === 1 ? 'country' : 'countries'} visited
          </div>
        )}
        {selected && (
          <CountryPanel
            key={selected.country}
            country={selected.country}
            spot={{ lat: selected.lat, lng: selected.lng }}
            focusMemoryId={focusMemoryId}
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
        <div className="brand">
          <h1>Digital Footprint</h1>
          <p>Spin the globe and click a country to see your memories there.</p>
        </div>
        {session && (
          <button
            className="sign-out"
            onClick={() => {
              setSelected(null)
              setPins([])
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
