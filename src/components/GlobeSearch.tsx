import { useMemo, useState, type KeyboardEvent } from 'react'
import { countries } from '../data/countries'
import type { Pin } from '../lib/memories'

type Result =
  | { kind: 'country'; name: string; count: number }
  | { kind: 'memory'; pin: Pin }

type Props = {
  pins: Pin[]
  counts: Map<string, number>
  onPickCountry: (name: string) => void
  onPickMemory: (pin: Pin) => void
}

const MAX_RESULTS = 7
const countryNames = countries.features.map((f) => f.properties.name).sort()

// Earlier matches rank higher: "Ja" finds Japan before Azerbaijan.
function score(text: string, query: string) {
  const i = text.toLowerCase().indexOf(query)
  return i < 0 ? -1 : i === 0 ? 0 : 1
}

// Finds countries and your own memories as you type, and flies the globe
// to whichever you pick.
export default function GlobeSearch({ pins, counts, onPickCountry, onPickMemory }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const countryHits = countryNames
      .map((name) => ({ name, s: score(name, q) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((r): Result => ({ kind: 'country', name: r.name, count: counts.get(r.name) ?? 0 }))
    const memoryHits = pins
      .filter((p) => score(p.title, q) >= 0 || (p.place && score(p.place, q) >= 0))
      .map((pin): Result => ({ kind: 'memory', pin }))
    return [...countryHits, ...memoryHits].slice(0, MAX_RESULTS)
  }, [query, pins, counts])

  function pick(result: Result) {
    if (result.kind === 'country') onPickCountry(result.name)
    else onPickMemory(result.pin)
    setQuery('')
    setOpen(false)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
    }
  }

  return (
    <div className="globe-search">
      <span className="search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        type="search"
        placeholder="Search a country or memory"
        aria-label="Search a country or memory"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // Wait a moment so a click on a result still counts.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {open && query.trim() && (
        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="search-empty">No matches</li>}
          {results.map((r, i) => (
            <li key={r.kind === 'country' ? `c:${r.name}` : `m:${r.pin.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={i === highlight ? 'highlighted' : undefined}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(r)}
              >
                {r.kind === 'country' ? (
                  <>
                    <span className="result-icon">🌍</span>
                    <span className="result-main">{r.name}</span>
                    {r.count > 0 && (
                      <span className="result-side">
                        {r.count} {r.count === 1 ? 'memory' : 'memories'}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="result-icon">📍</span>
                    <span className="result-main">{r.pin.title}</span>
                    <span className="result-side">{r.pin.place ?? r.pin.country}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
