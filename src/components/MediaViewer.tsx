import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Media } from '../lib/memories'

type Props = {
  items: Media[]
  index: number
  title: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

// Plays a video as soon as it opens. Browsers sometimes block videos with
// sound from starting by themselves, so if that happens it starts muted
// instead (the sound can be turned on with the controls). If the browser
// can't play the file at all, it says so rather than showing a frozen frame.
function ViewerVideo({ src, fileName }: { src: string; fileName: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.play().catch(() => {
      video.muted = true
      video.play().catch(() => {
        // Still blocked: the play button in the controls will work.
      })
    })
  }, [src])

  if (failed) {
    return (
      <div className="viewer-error" onClick={(e) => e.stopPropagation()}>
        <p>This video can't play in your browser.</p>
        <p className="hint">
          It may be in a format like HEVC, which iPhones use but many browsers can't play.
        </p>
        {/* Supabase sends the file as a download when the link asks for one. */}
        <a href={`${src}&download=${encodeURIComponent(fileName)}`} className="secondary">
          Download the video
        </a>
      </div>
    )
  }

  return (
    <video
      ref={ref}
      src={src}
      controls
      playsInline
      preload="auto"
      onError={() => setFailed(true)}
      // A video the browser can't decode may load with sound but no picture.
      onLoadedMetadata={(e) => {
        if (e.currentTarget.videoWidth === 0) setFailed(true)
      }}
      onClick={(e) => e.stopPropagation()}
    />
  )
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
          <ViewerVideo
            key={item.id}
            src={item.url}
            fileName={item.path.split('/').pop() ?? 'video'}
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
