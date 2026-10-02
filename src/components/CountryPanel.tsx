import { useCallback, useEffect, useRef, useState } from 'react'
import { listMemories, deleteMemory, type Memory } from '../lib/memories'
import MemoryForm from './MemoryForm'
import MediaViewer from './MediaViewer'
import MemoryCard from './MemoryCard'
import { errorText } from '../lib/errors'

type Props = {
  country: string
  userId: string
  spot: { lat: number; lng: number }
  focusMemoryId: string | null
  onClose: () => void
  onChanged: () => void
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

      <button className="primary add-memory" onClick={() => setAdding(true)}>
        + Add a memory
      </button>
      {adding && (
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
      )}

      {error && <p className="form-message error">{error}</p>}
      {memories === null && !error && <p className="empty">Loading…</p>}
      {memories?.length === 0 && <p className="empty">No memories here yet.</p>}

      <div className="memory-list">
        {memories?.map((m) => (
          <MemoryCard
            key={m.id}
            memory={m}
            focused={m.id === focusMemoryId}
            onOpenMedia={(index) => setViewing({ memory: m, index })}
            onDelete={() => remove(m)}
          />
        ))}
      </div>

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
