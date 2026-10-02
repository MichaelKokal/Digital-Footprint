import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import type { GeoJSON as LeafletGeoJSON, Layer, Path, PathOptions } from 'leaflet'
import type { Feature, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { countries, type CountryProps } from '../data/countries'

type Props = {
  selected: string | null
  onSelect: (name: string) => void
}

const baseStyle: PathOptions = {
  color: '#5b6b7a',
  weight: 0.8,
  fillColor: '#9fb7c9',
  fillOpacity: 0.25,
}
const hoverStyle: PathOptions = { fillOpacity: 0.5, weight: 1.5 }
const selectedStyle: PathOptions = {
  fillColor: '#e4572e',
  fillOpacity: 0.6,
  color: '#b83a17',
  weight: 2,
}

export default function WorldMap({ selected, onSelect }: Props) {
  const layerRef = useRef<LeafletGeoJSON | null>(null)
  // Leaflet event handlers are bound once, so they read the latest selection from a ref.
  const selectedRef = useRef(selected)

  const styleFor = (name: string): PathOptions =>
    name === selectedRef.current ? { ...baseStyle, ...selectedStyle } : baseStyle

  useEffect(() => {
    selectedRef.current = selected
    layerRef.current?.eachLayer((layer) => {
      const f = (layer as Layer & { feature: Feature<Geometry, CountryProps> }).feature
      ;(layer as Path).setStyle(styleFor(f.properties.name))
    })
  }, [selected])

  const onEachCountry = (f: Feature<Geometry, CountryProps>, layer: Layer) => {
    const name = f.properties.name
    layer.bindTooltip(name, { sticky: true })
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
