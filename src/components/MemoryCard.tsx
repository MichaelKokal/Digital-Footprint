import type { Media, Memory } from '../lib/memories'

type Props = {
  memory: Memory
  focused: boolean
  onOpenMedia: (index: number) => void
  onDelete: () => void
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function Preview({ item, alt }: { item: Media; alt: string }) {
  if (!item.url) return null
  return item.kind === 'video' ? (
    <>
      <video src={item.url} muted preload="metadata" />
      <span className="play-icon">▶</span>
    </>
  ) : (
    <img src={item.url} alt={alt} loading="lazy" />
  )
}

// A memory shown like a travel-journal card: the first photo as a big
// cover with the title over it, and any other photos in a strip below.
export default function MemoryCard({ memory: m, focused, onOpenMedia, onDelete }: Props) {
  const media = m.media.filter((item) => item.url)
  const [cover, ...rest] = media

  const heading = (
    <>
      <h3>{m.title}</h3>
      <div className="memory-meta">
        {m.place && <span>📍 {m.place}</span>}
        {m.happened_on && <time>{formatDate(m.happened_on)}</time>}
      </div>
    </>
  )

  return (
    <article data-memory-id={m.id} className={focused ? 'memory-card focused' : 'memory-card'}>
      {cover ? (
        <button
          className="memory-cover"
          aria-label={`Open photos for ${m.title}`}
          onClick={() => onOpenMedia(m.media.indexOf(cover))}
        >
          <Preview item={cover} alt={m.title} />
          <div className="memory-cover-text">{heading}</div>
          {media.length > 1 && <span className="media-count">{media.length} items</span>}
        </button>
      ) : (
        <div className="memory-plain-head">{heading}</div>
      )}

      <div className="memory-body">
        {m.note && <p className="note">{m.note}</p>}
        {rest.length > 0 && (
          <div className="media-strip">
            {rest.map((item) => (
              <button
                key={item.id}
                className="media-thumb"
                aria-label={`Open ${item.kind}`}
                onClick={() => onOpenMedia(m.media.indexOf(item))}
              >
                <Preview item={item} alt={m.title} />
              </button>
            ))}
          </div>
        )}
        <div className="memory-actions">
          <button className="link danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
