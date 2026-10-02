import { useCallback, useEffect, useState } from 'react'
import { listMemories, deleteMemory, type Memory } from '../lib/memories'
import MemoryForm from './MemoryForm'

type Props = {
  country: string
  userId: string
  onClose: () => void
  onChanged: () => void
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function CountryPanel({ country, userId, onClose, onChanged }: Props) {
  const [memories, setMemories] = useState<Memory[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

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
    <aside className="country-panel">
      <header>
        <h2>{country}</h2>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </header>

      {adding ? (
        <MemoryForm
          country={country}
          userId={userId}
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
        <article key={m.id} className="memory">
          <div className="memory-head">
            <div>
              <h3>{m.title}</h3>
              {m.happened_on && <time>{formatDate(m.happened_on)}</time>}
            </div>
            <button className="link danger" onClick={() => remove(m)}>
              Delete
            </button>
          </div>
          {m.note && <p className="note">{m.note}</p>}
          {m.media.length > 0 && (
            <div className="media-grid">
              {m.media.map((item) =>
                !item.url ? null : item.kind === 'video' ? (
                  <video key={item.id} src={item.url} controls preload="metadata" />
                ) : (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                    <img src={item.url} alt={m.title} loading="lazy" />
                  </a>
                ),
              )}
            </div>
          )}
        </article>
      ))}
    </aside>
  )
}
