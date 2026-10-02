type Props = {
  country: string
  onClose: () => void
}

export default function CountryPanel({ country, onClose }: Props) {
  return (
    <aside className="country-panel">
      <header>
        <h2>{country}</h2>
        <button onClick={onClose} aria-label="Close">×</button>
      </header>
      <p className="empty">No memories here yet.</p>
    </aside>
  )
}
