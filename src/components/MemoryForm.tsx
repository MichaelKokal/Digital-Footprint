import { useState, type FormEvent } from 'react'
import { createMemory } from '../lib/memories'

type Props = {
  country: string
  userId: string
  onSaved: () => void
  onCancel: () => void
}

const MAX_FILE_MB = 50

export default function MemoryForm({ country, userId, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [happenedOn, setHappenedOn] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const tooBig = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024)
    if (tooBig) {
      setError(`"${tooBig.name}" is over ${MAX_FILE_MB} MB.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createMemory(userId, { country, title, note, happenedOn, files })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <form className="memory-form" onSubmit={submit}>
      <label>
        Title
        <input required value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Date
        <input type="date" value={happenedOn} onChange={(e) => setHappenedOn(e.target.value)} />
      </label>
      <label>
        Story
        <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label>
        Photos and videos
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      {error && <p className="form-message error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="link" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save memory'}
        </button>
      </div>
    </form>
  )
}
