import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import { listMemories, deleteMemory, type Memory } from '../lib/memories'
import MemoryForm from './MemoryForm'
import MediaViewer from './MediaViewer'
import MemoryCard from './MemoryCard'
import { errorText } from '../lib/errors'
import { isPhoneLayout } from '../lib/device'

// How far the panel must be dragged down (in pixels) before it closes.
const SWIPE_CLOSE_DISTANCE = 90

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

  // On phones, dragging the panel's header downward slides it away.
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)

  function onTouchStart(e: TouchEvent) {
    if (isPhoneLayout()) dragStart.current = e.touches[0].clientY
  }
  function onTouchMove(e: TouchEvent) {
    if (dragStart.current === null) return
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current))
  }
  function onTouchEnd() {
    if (dragStart.current === null) return
    dragStart.current = null
    if (dragY > SWIPE_CLOSE_DISTANCE) onClose()
    else setDragY(0)
  }

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
    <aside
      className="country-panel"
      ref={panelRef}
      style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
    >
      {/* Stays pinned to the top while the memories scroll underneath. */}
      <header
        className="panel-head"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="panel-head-row">
          <div className="panel-title">
            <h2>{country}</h2>
            {memories && (
              <span className="memory-count">
                {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
              </span>
            )}
          </div>
          <div className="panel-head-actions">
            <button className="add-small" onClick={() => setAdding(true)} aria-label="Add a memory">
              +
            </button>
            <button className="close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>
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
