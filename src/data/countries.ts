import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import world from 'world-atlas/countries-110m.json'

export type CountryProps = { name: string }

const topology = world as unknown as Topology<{
  countries: GeometryCollection<CountryProps>
}>

// World country outlines (Natural Earth, 1:110m), converted to GeoJSON once at load.
export const countries = feature(
  topology,
  topology.objects.countries,
) as FeatureCollection<Geometry, CountryProps>
