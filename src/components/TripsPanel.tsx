import type { Pin } from '../lib/memories'

type Props = {
  pins: Pin[]
  activeId: string | null
  onPick: (pin: Pin) => void
  onClose: () => void
}

function formatMonth(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// Newest first by the date it happened; undated memories go last,
// newest-added first.
function byDate(a: Pin, b: Pin) {
  if (a.happened_on && b.happened_on) return b.happened_on.localeCompare(a.happened_on)
  if (a.happened_on) return -1
  if (b.happened_on) return 1
  return b.created_at.localeCompare(a.created_at)
}

// A timeline of every memory, grouped by year. Picking one flies the
// globe to its pin.
export default function TripsPanel({ pins, activeId, onPick, onClose }: Props) {
  const groups = new Map<string, Pin[]>()
  for (const pin of [...pins].sort(byDate)) {
    const year = pin.happened_on?.slice(0, 4) ?? 'No date'
    groups.set(year, [...(groups.get(year) ?? []), pin])
  }
  const countryCount = new Set(pins.map((p) => p.country)).size

  return (
    <aside className="country-panel trips-panel" aria-label="My trips">
      <header className="panel-head">
        <div className="panel-head-row">
          <div className="panel-title">
            <h2>My trips</h2>
            <span className="trips-summary">
              {pins.length} {pins.length === 1 ? 'memory' : 'memories'} · {countryCount}{' '}
              {countryCount === 1 ? 'country' : 'countries'}
            </span>
          </div>
          <button className="close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </header>

      {pins.length === 0 && (
        <p className="empty">No memories yet. Click a country on the globe to add your first one.</p>
      )}

      {[...groups].map(([year, yearPins]) => (
        <section key={year} className="trip-year">
          <h3>{year}</h3>
          <ol className="trip-list">
            {yearPins.map((pin) => (
              <li key={pin.id}>
                <button
                  className={pin.id === activeId ? 'trip active' : 'trip'}
                  onClick={() => onPick(pin)}
                >
                  <span className="trip-date">
                    {pin.happened_on ? formatMonth(pin.happened_on) : '—'}
                  </span>
                  <span className="trip-text">
                    <span className="trip-title">{pin.title}</span>
                    <span className="trip-place">
                      {pin.place ? `${pin.place}` : pin.country}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </aside>
  )
}
