// Place search using OpenStreetMap's free Nominatim service.
// Their usage policy allows light use like this: one search per button press.

export type Place = {
  label: string
  lat: number
  lng: number
}

type NominatimResult = {
  name: string
  display_name: string
  lat: string
  lon: string
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    'accept-language': 'en',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error('Place search is unavailable right now.')
  const results = (await res.json()) as NominatimResult[]
  return results.map((r) => ({
    // "Kyoto, Kyoto Prefecture, Japan" reads better than the full address.
    label: r.display_name.split(', ').slice(0, 3).join(', '),
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
}
