import { supabase, supabaseKey, supabaseUrl } from './supabase'
import { countryCenter } from '../data/countries'

const BUCKET = 'memories'
const URL_LIFETIME_SECONDS = 60 * 60

export type Media = {
  id: string
  path: string
  kind: 'image' | 'video'
  url: string | null
}

export type Memory = {
  id: string
  country: string
  title: string
  note: string | null
  happened_on: string | null
  place: string | null
  lat: number | null
  lng: number | null
  created_at: string
  media: Media[]
}

export type NewMemory = {
  country: string
  title: string
  note: string
  happenedOn: string
  place: string | null
  lat: number
  lng: number
  files: File[]
}

type MemoryRow = Omit<Memory, 'media'> & {
  memory_media: Omit<Media, 'url'>[]
}

export async function listMemories(country: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*, memory_media(id, path, kind)')
    .eq('country', country)
    .order('happened_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = data as MemoryRow[]
  const paths = rows.flatMap((r) => r.memory_media.map((m) => m.path))
  const urls = new Map<string, string>()
  // Files are private, so each one gets a temporary link to show it.
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, URL_LIFETIME_SECONDS)
    if (signError) throw signError
    for (const s of signed) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl)
  }

  return rows.map(({ memory_media, ...memory }) => ({
    ...memory,
    media: memory_media.map((m) => ({ ...m, url: urls.get(m.path) ?? null })),
  }))
}

export type UploadProgress = {
  // Which file is uploading now (1-based) out of how many.
  current: number
  total: number
  // Share of all bytes uploaded so far, from 0 to 1.
  fraction: number
}

// Uploads one file straight to Supabase Storage, reporting bytes as they go.
// (The Supabase library's own upload can't report progress partway through.)
async function uploadWithProgress(path: string, file: File, onBytes: (sent: number) => void) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('You are signed out. Please sign in again.')

  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodedPath}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', supabaseKey)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => onBytes(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let message = `Upload of "${file.name}" failed.`
      try {
        message = JSON.parse(xhr.responseText).message ?? message
      } catch {
        // Keep the general message.
      }
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error(`Upload of "${file.name}" failed. Check your connection.`))
    xhr.send(file)
  })
}

export async function createMemory(
  userId: string,
  input: NewMemory,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  const { data: memory, error } = await supabase
    .from('memories')
    .insert({
      country: input.country,
      title: input.title,
      note: input.note || null,
      happened_on: input.happenedOn || null,
      place: input.place,
      lat: input.lat,
      lng: input.lng,
    })
    .select('id')
    .single()
  if (error) throw error

  const uploaded: string[] = []
  const totalBytes = input.files.reduce((sum, f) => sum + f.size, 0) || 1
  let doneBytes = 0
  try {
    for (const [i, file] of input.files.entries()) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const path = `${userId}/${memory.id}/${crypto.randomUUID()}.${ext}`
      await uploadWithProgress(path, file, (sent) =>
        onProgress?.({
          current: i + 1,
          total: input.files.length,
          fraction: Math.min(1, (doneBytes + sent) / totalBytes),
        }),
      )
      doneBytes += file.size
      uploaded.push(path)
    }
    if (uploaded.length > 0) {
      const { error: mediaError } = await supabase.from('memory_media').insert(
        uploaded.map((path, i) => ({
          memory_id: memory.id,
          path,
          kind: input.files[i].type.startsWith('video/') ? 'video' : 'image',
        })),
      )
      if (mediaError) throw mediaError
    }
  } catch (e) {
    // Don't leave a half-saved memory behind.
    if (uploaded.length > 0) await supabase.storage.from(BUCKET).remove(uploaded)
    await supabase.from('memories').delete().eq('id', memory.id)
    throw e
  }
}

export async function deleteMemory(memory: Memory): Promise<void> {
  const paths = memory.media.map((m) => m.path)
  if (paths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) throw error
  }
  const { error } = await supabase.from('memories').delete().eq('id', memory.id)
  if (error) throw error
}

export type Pin = {
  id: string
  country: string
  title: string
  place: string | null
  happened_on: string | null
  created_at: string
  lat: number
  lng: number
}

// Every memory's location, for drawing pins on the globe.
export async function listPins(): Promise<Pin[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('id, country, title, place, happened_on, created_at, lat, lng')
  if (error) throw error
  const pins = data.map((m) => {
    // Memories saved before locations existed sit in the middle of their country.
    const spot = m.lat != null && m.lng != null ? { lat: m.lat, lng: m.lng } : countryCenter(m.country)
    return { ...m, ...spot } as Pin
  })
  return spreadOverlapping(pins)
}

// Pins at exactly the same spot are fanned out in a small circle so each can be clicked.
function spreadOverlapping(pins: Pin[]): Pin[] {
  const groups = new Map<string, Pin[]>()
  for (const p of pins) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  return [...groups.values()].flatMap((group) =>
    group.length === 1
      ? group
      : group.map((p, i) => {
          const angle = (2 * Math.PI * i) / group.length
          return { ...p, lat: p.lat + 0.5 * Math.sin(angle), lng: p.lng + 0.5 * Math.cos(angle) }
        }),
  )
}
