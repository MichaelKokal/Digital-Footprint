import { supabase } from './supabase'

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
  created_at: string
  media: Media[]
}

export type NewMemory = {
  country: string
  title: string
  note: string
  happenedOn: string
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

export async function createMemory(userId: string, input: NewMemory): Promise<void> {
  const { data: memory, error } = await supabase
    .from('memories')
    .insert({
      country: input.country,
      title: input.title,
      note: input.note || null,
      happened_on: input.happenedOn || null,
    })
    .select('id')
    .single()
  if (error) throw error

  const uploaded: string[] = []
  try {
    for (const file of input.files) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const path = `${userId}/${memory.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError
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
