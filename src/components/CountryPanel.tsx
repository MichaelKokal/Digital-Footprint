import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import { listMemories, deleteMemory, type Memory } from '../lib/memories'
import MemoryForm from './MemoryForm'
import MediaViewer from './MediaViewer'
import MemoryCard from './MemoryCard'
import { errorText } from '../lib/errors'
import { isPhoneLayout } from '../lib/device'

// How far (in pixels) the phone sheet must be dragged to change size or close.
const SWIPE_DISTANCE = 60
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

  // On phones the panel is a sheet with two sizes: half the screen, or
  // expanded to nearly full. Dragging its header resizes it under your
  // finger; letting go snaps it to a size, or closes it.
  const [expanded, setExpanded] = useState(false)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startHeight: number; dy: number } | null>(null)

  function onTouchStart(e: TouchEvent) {
    if (!isPhoneLayout() || !panelRef.current) return
    drag.current = {
      startY: e.touches[0].clientY,
      startHeight: panelRef.current.offsetHeight,
      dy: 0,
    }
  }
  function onTouchMove(e: TouchEvent) {
    const d = drag.current
    if (!d) return
    d.dy = e.touches[0].clientY - d.startY
    setDragHeight(Math.min(Math.max(d.startHeight - d.dy, 60), window.innerHeight - 12))
  }
  function onTouchEnd() {
    const d = drag.current
    if (!d) return
    drag.current = null
    setDragHeight(null)
    if (expanded) {
      // A long pull from full size closes it; a short one shrinks it to half.
      if (d.dy > d.startHeight / 2) onClose()
      else if (d.dy > SWIPE_DISTANCE) setExpanded(false)
    } else if (d.dy < -SWIPE_DISTANCE) {
      setExpanded(true)
    } else if (d.dy > SWIPE_CLOSE_DISTANCE) {
      onClose()
    }
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
      className={expanded ? 'country-panel expanded' : 'country-panel'}
      ref={panelRef}
      style={dragHeight === null ? undefined : { height: dragHeight, transition: 'none' }}
    >
      {/* Stays pinned to the top while the memories scroll underneath. */}
      <header
        className="panel-head"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          className="sheet-handle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Shrink panel' : 'Expand panel'}
        />
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
