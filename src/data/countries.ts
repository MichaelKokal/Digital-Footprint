import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson'
import { geoArea, geoCentroid, geoContains } from 'd3-geo'
import world from 'world-atlas/countries-110m.json'

export type CountryProps = { name: string }
export type CountryFeature = Feature<Geometry, CountryProps>

const topology = world as unknown as Topology<{
  countries: GeometryCollection<CountryProps>
}>

// World country outlines (Natural Earth, 1:110m), converted to GeoJSON once at load.
export const countries = feature(
  topology,
  topology.objects.countries,
) as FeatureCollection<Geometry, CountryProps>

// The middle of a country's largest land area, so e.g. France centers on
// mainland France rather than somewhere between Paris and French Guiana.
function mainCenter(f: CountryFeature): [number, number] {
  const g = f.geometry
  if (g.type !== 'MultiPolygon') return geoCentroid(f)
  let best: Polygon = { type: 'Polygon', coordinates: g.coordinates[0] }
  for (const coords of g.coordinates) {
    const p: Polygon = { type: 'Polygon', coordinates: coords }
    if (geoArea(p) > geoArea(best)) best = p
  }
  return geoCentroid(best)
}

const centers = new Map<string, { lat: number; lng: number }>()
for (const f of countries.features) {
  const [lng, lat] = mainCenter(f)
  centers.set(f.properties.name, { lat, lng })
}

export function countryCenter(name: string) {
  return centers.get(name) ?? { lat: 0, lng: 0 }
}

// Which country a point falls in, or null for the ocean.
export function countryAt(lat: number, lng: number): string | null {
  const f = countries.features.find((c) => geoContains(c, [lng, lat]))
  return f?.properties.name ?? null
}
