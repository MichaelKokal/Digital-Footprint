import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Media } from '../lib/memories'

type Props = {
  items: Media[]
  index: number
  title: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

// Full-screen viewer for a memory's photos and videos, shown over the page.
export default function MediaViewer({ items, index, title, onIndexChange, onClose }: Props) {
  const item = items[index]
  const hasMany = items.length > 1
  const prev = () => onIndexChange((index - 1 + items.length) % items.length)
  const next = () => onIndexChange((index + 1) % items.length)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasMany) prev()
      else if (e.key === 'ArrowRight' && hasMany) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!item?.url) return null

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="viewer-top" onClick={(e) => e.stopPropagation()}>
        <span>
          {title}
          {hasMany && ` · ${index + 1} / ${items.length}`}
        </span>
        <button onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="viewer-stage">
        {item.kind === 'video' ? (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img key={item.id} src={item.url} alt={title} onClick={(e) => e.stopPropagation()} />
        )}
      </div>

      {hasMany && (
        <>
          <button
            className="viewer-nav prev"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
          >
            ‹
          </button>
          <button
            className="viewer-nav next"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
          >
            ›
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
