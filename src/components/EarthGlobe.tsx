import { useEffect, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { countries, countryCenter, type CountryFeature } from '../data/countries'

export type GlobeClick = { country: string; lat: number; lng: number }

type Props = {
  selected: string | null
  counts: Map<string, number>
  onSelect: (click: GlobeClick) => void
}

const COLORS = {
  base: 'rgba(255, 255, 255, 0.03)',
  hover: 'rgba(255, 255, 255, 0.28)',
  visited: 'rgba(42, 157, 143, 0.5)',
  selected: 'rgba(228, 87, 46, 0.55)',
  stroke: 'rgba(255, 255, 255, 0.35)',
  side: 'rgba(0, 0, 0, 0.15)',
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

// Keeps the globe sized to its container.
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

export default function EarthGlobe({ selected, counts, onSelect }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [containerRef, size] = useSize<HTMLDivElement>()
  const [hovered, setHovered] = useState<CountryFeature | null>(null)

  // Spin slowly on its own until the person grabs the globe.
  function onGlobeReady() {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4
    controls.addEventListener('start', () => (controls.autoRotate = false))
    globeRef.current?.pointOfView({ altitude: 2.2 })
  }

  // Turn the globe to face the chosen country.
  useEffect(() => {
    if (!selected || !globeRef.current) return
    const { lat, lng } = countryCenter(selected)
    globeRef.current.controls().autoRotate = false
    globeRef.current.pointOfView({ lat, lng, altitude: 1.6 }, 1000)
  }, [selected])

  const capColor = (f: CountryFeature) => {
    const name = f.properties.name
    if (name === selected) return COLORS.selected
    if (f === hovered) return COLORS.hover
    if (counts.has(name)) return COLORS.visited
    return COLORS.base
  }

  return (
    <div ref={containerRef} className="globe">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          onGlobeReady={onGlobeReady}
          globeImageUrl="/textures/earth-blue-marble.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          backgroundImageUrl="/textures/night-sky.png"
          atmosphereColor="#7cc4ff"
          atmosphereAltitude={0.18}
          polygonsData={countries.features}
          polygonCapColor={(d) => capColor(d as CountryFeature)}
          polygonSideColor={() => COLORS.side}
          polygonStrokeColor={() => COLORS.stroke}
          polygonAltitude={(d) => {
            const f = d as CountryFeature
            return f === hovered || f.properties.name === selected ? 0.02 : 0.006
          }}
          polygonsTransitionDuration={200}
          polygonLabel={(d) => {
            const name = (d as CountryFeature).properties.name
            const count = counts.get(name) ?? 0
            const extra = count ? ` · ${count} ${count === 1 ? 'memory' : 'memories'}` : ''
            return `<div class="globe-label">${escapeHtml(name)}${extra}</div>`
          }}
          onPolygonHover={(d) => setHovered(d as CountryFeature | null)}
          onPolygonClick={(d, _event, { lat, lng }) =>
            onSelect({ country: (d as CountryFeature).properties.name, lat, lng })
          }
        />
      )}
    </div>
  )
}
