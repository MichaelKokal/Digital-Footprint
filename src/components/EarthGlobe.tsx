import { useEffect, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import {
  AdditiveBlending,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three'
import { countries, type CountryFeature } from '../data/countries'
import type { Pin } from '../lib/memories'

export type GlobeClick = { country: string; lat: number; lng: number }

type Props = {
  selected: string | null
  // Where the globe should turn to face.
  focus: { lat: number; lng: number } | null
  counts: Map<string, number>
  pins: Pin[]
  // The memory being viewed; its pin gently pulses.
  activePinId: string | null
  onSelect: (click: GlobeClick) => void
  onPinClick: (pin: Pin) => void
}

const PIN_HEIGHT = 0.06
const PIN_COLOR = '#e4572e'

// Shared shapes for every pin keep the globe fast with many pins.
const pinHeadGeometry = new SphereGeometry(0.9, 16, 16)
const pinHeadMaterial = new MeshLambertMaterial({
  color: PIN_COLOR,
  emissive: PIN_COLOR,
  emissiveIntensity: 0.35,
})
const pinGlowGeometry = new SphereGeometry(2, 16, 16)

type PinObject = { group: Group; glow: MeshBasicMaterial }

// A pin head: a solid red ball inside a soft see-through glow.
function makePinHead(): PinObject {
  const glow = new MeshBasicMaterial({
    color: PIN_COLOR,
    transparent: true,
    opacity: 0.18,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const group = new Group()
  group.add(new Mesh(pinHeadGeometry, pinHeadMaterial))
  group.add(new Mesh(pinGlowGeometry, glow))
  return { group, glow }
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

function pinLabel(pin: Pin) {
  const where = pin.place ? `<br><small>${escapeHtml(pin.place)}</small>` : ''
  return `<div class="globe-label"><strong>${escapeHtml(pin.title)}</strong>${where}</div>`
}

export default function EarthGlobe({
  selected,
  focus,
  counts,
  pins,
  activePinId,
  onSelect,
  onPinClick,
}: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [containerRef, size] = useSize<HTMLDivElement>()
  const [hovered, setHovered] = useState<CountryFeature | null>(null)

  // Pin animation reads these every frame, so they live in refs, not state.
  const pinObjects = useRef(new Map<string, PinObject>())
  const hoveredPinId = useRef<string | null>(null)
  const activePinRef = useRef(activePinId)
  useEffect(() => {
    activePinRef.current = activePinId
  }, [activePinId])

  // Hovered pins grow and brighten; the active pin breathes in and out.
  useEffect(() => {
    let frame = 0
    const animate = (time: number) => {
      const pulse = (Math.sin(time / 300) + 1) / 2
      for (const [id, pin] of pinObjects.current) {
        const isHovered = id === hoveredPinId.current
        const isActive = id === activePinRef.current
        const targetScale = isHovered ? 1.6 : isActive ? 1.25 + 0.2 * pulse : 1
        const targetGlow = isHovered ? 0.5 : isActive ? 0.25 + 0.3 * pulse : 0.18
        const scale = pin.group.scale.x + (targetScale - pin.group.scale.x) * 0.2
        pin.group.scale.setScalar(scale)
        pin.glow.opacity += (targetGlow - pin.glow.opacity) * 0.2
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Forget pins whose memories were deleted.
  useEffect(() => {
    const ids = new Set(pins.map((p) => p.id))
    for (const id of pinObjects.current.keys()) {
      if (!ids.has(id)) pinObjects.current.delete(id)
    }
  }, [pins])

  const hoverPin = (d: object | null) => {
    hoveredPinId.current = d ? (d as Pin).id : null
  }

  // Spin slowly on its own until the person grabs the globe.
  function onGlobeReady() {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4
    controls.addEventListener('start', () => (controls.autoRotate = false))
    globeRef.current?.pointOfView({ altitude: 2.2 })
  }

  // Turn the globe to face the chosen country or pin.
  useEffect(() => {
    if (!focus || !globeRef.current) return
    globeRef.current.controls().autoRotate = false
    globeRef.current.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.6 }, 1000)
  }, [focus])

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
          // Pin sticks
          pointsData={pins}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={PIN_HEIGHT}
          pointRadius={0.12}
          pointColor={() => '#f2f4f8'}
          pointsTransitionDuration={0}
          pointLabel={(d) => pinLabel(d as Pin)}
          onPointClick={(d) => onPinClick(d as Pin)}
          onPointHover={hoverPin}
          // Pin heads
          objectsData={pins}
          objectLat="lat"
          objectLng="lng"
          objectAltitude={PIN_HEIGHT}
          objectThreeObject={(d) => {
            const pin = makePinHead()
            pinObjects.current.set((d as Pin).id, pin)
            return pin.group
          }}
          objectLabel={(d) => pinLabel(d as Pin)}
          onObjectClick={(d) => onPinClick(d as Pin)}
          onObjectHover={hoverPin}
        />
      )}
    </div>
  )
}
