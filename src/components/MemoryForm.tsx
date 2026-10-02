import { useState, type FormEvent } from 'react'
import { createMemory } from '../lib/memories'
import { searchPlaces, type Place } from '../lib/places'
import { countryAt } from '../data/countries'

type Props = {
  country: string
  userId: string
  // Where the pin goes unless a place is searched for: the spot that was clicked.
  spot: { lat: number; lng: number }
  onSaved: () => void
  onCancel: () => void
}

const MAX_FILE_MB = 50

export default function MemoryForm({ country, userId, spot, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [happenedOn, setHappenedOn] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [location, setLocation] = useState<Place>({ label: '', ...spot })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A searched place can be in another country; save the memory there.
  const saveCountry = countryAt(location.lat, location.lng) ?? country

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      setResults(await searchPlaces(query.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    }
    setSearching(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const tooBig = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024)
    if (tooBig) {
      setError(`"${tooBig.name}" is over ${MAX_FILE_MB} MB.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createMemory(userId, {
        country: saveCountry,
        title,
        note,
        happenedOn,
        place: location.label || null,
        lat: location.lat,
        lng: location.lng,
        files,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <form className="memory-form" onSubmit={submit}>
      <label>
        Title
        <input required value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Date
        <input type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} />
      </label>

      <div className="location">
        <span className="location-label">Pin location</span>
        <p className="location-current">
          📍 {location.label || `The spot you clicked in ${country}`}
        </p>
        <div className="location-search">
          <input
            placeholder="Search a city, state or landmark"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                search()
              }
            }}
          />
          <button type="button" className="secondary" onClick={search} disabled={searching}>
            {searching ? '…' : 'Find'}
          </button>
        </div>
        {results && results.length === 0 && <p className="hint">No places found.</p>}
        {results && (
          <p className="hint">
            Search by{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              © OpenStreetMap
            </a>
          </p>
        )}
        {results && results.length > 0 && (
          <ul className="place-results">
            {results.map((p) => (
              <li key={`${p.lat},${p.lng}`}>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(p)
                    setResults(null)
                    setQuery('')
                  }}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {saveCountry !== country && (
          <p className="hint">This place is in {saveCountry}, so the memory will be saved there.</p>
        )}
      </div>

      <label>
        Story
        <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label>
        Photos and videos
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      {error && <p className="form-message error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="link" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save memory'}
        </button>
      </div>
    </form>
  )
}
