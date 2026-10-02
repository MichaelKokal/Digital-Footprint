import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON, Layer, Path, PathOptions } from 'leaflet'
import type { Feature, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { countries, type CountryProps } from '../data/countries'

type Props = {
  selected: string | null
  counts: Map<string, number>
  onSelect: (name: string) => void
}

type CountryLayer = Path & { feature: Feature<Geometry, CountryProps> }

const baseStyle: PathOptions = {
  color: '#5b6b7a',
  weight: 0.8,
  fillColor: '#9fb7c9',
  fillOpacity: 0.25,
}
const visitedStyle: PathOptions = { fillColor: '#2a9d8f', fillOpacity: 0.55 }
const hoverStyle: PathOptions = { fillOpacity: 0.7, weight: 1.5 }
const selectedStyle: PathOptions = {
  fillColor: '#e4572e',
  fillOpacity: 0.6,
  color: '#b83a17',
  weight: 2,
}

function tooltipText(name: string, count: number) {
  if (count === 0) return name
  return `${name} · ${count} ${count === 1 ? 'memory' : 'memories'}`
}

export default function WorldMap({ selected, counts, onSelect }: Props) {
  const layerRef = useRef<LeafletGeoJSON | null>(null)
  // Leaflet event handlers are bound once, so they read the latest values from refs.
  const selectedRef = useRef(selected)
  const countsRef = useRef(counts)

  const styleFor = (name: string): PathOptions => {
    if (name === selectedRef.current) return { ...baseStyle, ...selectedStyle }
    if (countsRef.current.has(name)) return { ...baseStyle, ...visitedStyle }
    return baseStyle
  }

  useEffect(() => {
    selectedRef.current = selected
    countsRef.current = counts
    layerRef.current?.eachLayer((layer) => {
      const name = (layer as CountryLayer).feature.properties.name
      ;(layer as CountryLayer).setStyle(styleFor(name))
      layer.setTooltipContent(tooltipText(name, counts.get(name) ?? 0))
    })
  }, [selected, counts])

  const onEachCountry = (f: Feature<Geometry, CountryProps>, layer: Layer) => {
    const name = f.properties.name
    layer.bindTooltip(tooltipText(name, countsRef.current.get(name) ?? 0), { sticky: true })
    layer.on({
      mouseover: () => (layer as Path).setStyle({ ...styleFor(name), ...hoverStyle }),
      mouseout: () => (layer as Path).setStyle(styleFor(name)),
      click: () => onSelect(name),
    })
  }

  return (
    <MapContainer
      center={[25, 10]}
      zoom={2}
      minZoom={2}
      maxBounds={[[-85, -200], [85, 200]]}
      worldCopyJump={false}
      className="world-map"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        noWrap
      />
      <GeoJSON
        ref={layerRef}
        data={countries}
        style={(f) => styleFor(f?.properties.name ?? '')}
        onEachFeature={onEachCountry}
      />
    </MapContainer>
  )
}
