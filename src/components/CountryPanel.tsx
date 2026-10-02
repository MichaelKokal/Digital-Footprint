import { useCallback, useEffect, useRef, useState } from 'react'
import { listMemories, deleteMemory, type Memory } from '../lib/memories'
import MemoryForm from './MemoryForm'
import MediaViewer from './MediaViewer'
import { errorText } from '../lib/errors'

type Props = {
  country: string
  userId: string
  spot: { lat: number; lng: number }
  focusMemoryId: string | null
  onClose: () => void
  onChanged: () => void
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function CountryPanel({
  country,
  userId,
  spot,
  focusMemoryId,
  onClose,
  onChanged,
}: Props) {
  const [memories, setMemories] = useState<Memory[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState<{ memory: Memory; index: number } | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setMemories(await listMemories(country))
    } catch (err) {
      setError(errorText(err, 'Could not load memories.'))
    }
  }, [country])

  useEffect(() => {
    let stale = false
    listMemories(country).then(
      (list) => !stale && setMemories(list),
      (err) => !stale && setError(errorText(err, 'Could not load memories.')),
    )
    return () => {
      stale = true
    }
  }, [country])

  // Scroll to the memory whose pin was clicked, once it has loaded.
  const panelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!focusMemoryId || !memories) return
    panelRef.current
      ?.querySelector(`[data-memory-id="${focusMemoryId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusMemoryId, memories])

  async function remove(memory: Memory) {
    if (!confirm(`Delete "${memory.title}" and its photos? This can't be undone.`)) return
    try {
      await deleteMemory(memory)
      onChanged()
      load()
    } catch (err) {
      setError(errorText(err, 'Could not delete.'))
    }
  }

  return (
    <aside className="country-panel" ref={panelRef}>
      <header>
        <h2>{country}</h2>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </header>

      {adding ? (
        <MemoryForm
          country={country}
          userId={userId}
          spot={spot}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            onChanged()
            load()
          }}
        />
      ) : (
        <button className="primary add-memory" onClick={() => setAdding(true)}>
          + Add a memory
        </button>
      )}

      {error && <p className="form-message error">{error}</p>}
      {memories === null && !error && <p className="empty">Loading…</p>}
      {memories?.length === 0 && !adding && <p className="empty">No memories here yet.</p>}

      {memories?.map((m) => (
        <article
          key={m.id}
          data-memory-id={m.id}
          className={m.id === focusMemoryId ? 'memory focused' : 'memory'}
        >
          <div className="memory-head">
            <div>
              <h3>{m.title}</h3>
              <div className="memory-meta">
                {m.place && <span>📍 {m.place}</span>}
                {m.happened_on && <time>{formatDate(m.happened_on)}</time>}
              </div>
            </div>
            <button className="link danger" onClick={() => remove(m)}>
              Delete
            </button>
          </div>
          {m.note && <p className="note">{m.note}</p>}
          {m.media.length > 0 && (
            <div className="media-grid">
              {m.media.map((item, i) =>
                !item.url ? null : (
                  <button
                    key={item.id}
                    className="media-thumb"
                    aria-label={`Open ${item.kind} ${i + 1}`}
                    onClick={() => setViewing({ memory: m, index: i })}
                  >
                    {item.kind === 'video' ? (
                      <>
                        <video src={item.url} muted preload="metadata" />
                        <span className="play-icon">▶</span>
                      </>
                    ) : (
                      <img src={item.url} alt={m.title} loading="lazy" />
                    )}
                  </button>
                ),
              )}
            </div>
          )}
        </article>
      ))}

      {viewing && (
        <MediaViewer
          items={viewing.memory.media}
          index={viewing.index}
          title={viewing.memory.title}
          onIndexChange={(index) => setViewing({ ...viewing, index })}
          onClose={() => setViewing(null)}
        />
      )}
    </aside>
  )
}
