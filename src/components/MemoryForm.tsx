import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { createMemory } from '../lib/memories'
import { searchPlaces, type Place } from '../lib/places'
import { countryAt } from '../data/countries'
import { errorText } from '../lib/errors'

type Props = {
  country: string
  userId: string
  // Where the pin goes unless a place is searched for: the spot that was clicked.
  spot: { lat: number; lng: number }
  onSaved: () => void
  onCancel: () => void
}

const MAX_FILE_MB = 50
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const isMedia = (f: File) => f.type.startsWith('image/') || f.type.startsWith('video/')
const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`

// A small preview of a chosen file. The preview link is created and cleaned
// up together so memory isn't leaked as files are added and removed.
function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null)
  const isVideo = file.type.startsWith('video/')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (mediaRef.current) mediaRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className={file.size > MAX_FILE_BYTES ? 'file-preview too-big' : 'file-preview'}>
      {isVideo ? <video ref={mediaRef} muted preload="metadata" /> : <img ref={mediaRef} alt="" />}
      {isVideo && <span className="play-icon">▶</span>}
      <span className="file-size">{formatSize(file.size)}</span>
      <button type="button" className="remove-file" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        ×
      </button>
    </div>
  )
}

export default function MemoryForm({ country, userId, spot, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [happenedOn, setHappenedOn] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [location, setLocation] = useState<Place>({ label: '', ...spot })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // A searched place can be in another country; save the memory there.
  const saveCountry = countryAt(location.lat, location.lng) ?? country
  const untouched = !title && !note && files.length === 0

  // Esc closes the pop-up, but only when nothing has been typed or added yet.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && untouched && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [untouched, busy, onCancel])

  function addFiles(list: FileList | null) {
    const incoming = Array.from(list ?? []).filter(isMedia)
    setFiles((current) => {
      const seen = new Set(current.map(fileKey))
      return [...current, ...incoming.filter((f) => !seen.has(fileKey(f)))]
    })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      setResults(await searchPlaces(query.trim()))
    } catch (err) {
      setError(errorText(err, 'Search failed.'))
    }
    setSearching(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const tooBig = files.find((f) => f.size > MAX_FILE_BYTES)
    if (tooBig) {
      setError(`"${tooBig.name}" is over ${MAX_FILE_MB} MB. Remove it to continue.`)
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
      setError(errorText(err, 'Something went wrong.'))
      setBusy(false)
    }
  }

  return createPortal(
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="memory-form-title">
        <div className="dialog-header">
          <div>
            <h2 id="memory-form-title">New memory</h2>
            <p>{country}</p>
          </div>
          <button type="button" className="close" onClick={onCancel} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>

        <form className="memory-form" onSubmit={submit}>
          <div
            className={dragging ? 'dropzone dragging' : 'dropzone'}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className="dropzone-icon">📷</span>
            <strong>Drop photos and videos here</strong>
            <span>or click to choose · up to {MAX_FILE_MB} MB each</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="file-previews">
              {files.map((f) => (
                <FilePreview
                  key={fileKey(f)}
                  file={f}
                  onRemove={() => setFiles((current) => current.filter((x) => x !== f))}
                />
              ))}
            </div>
          )}

          <div className="field-row">
            <label>
              Title
              <input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Date
              <input type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} />
            </label>
          </div>

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
            {results && (
              <p className="hint">
                Search by{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  © OpenStreetMap
                </a>
              </p>
            )}
            {saveCountry !== country && (
              <p className="hint">This place is in {saveCountry}, so the memory will be saved there.</p>
            )}
          </div>

          <label>
            Story
            <textarea
              rows={4}
              placeholder="What happened here?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
      </div>
    </div>,
    document.body,
  )
}
