// The logo: a small globe whose lines turn, as if it's spinning, with a
// glowing pin on it.
export default function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="brand-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff7a45" />
          <stop offset="100%" stopColor="#ffc46b" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="rgba(255,122,69,0.08)" stroke="url(#brand-gradient)" strokeWidth="2" />
      <ellipse className="meridian" cx="16" cy="16" rx="6.5" ry="13" fill="none" stroke="url(#brand-gradient)" strokeWidth="1.4" />
      <ellipse className="meridian late" cx="16" cy="16" rx="6.5" ry="13" fill="none" stroke="url(#brand-gradient)" strokeWidth="1.4" />
      <path d="M3.5 16h25" stroke="url(#brand-gradient)" strokeWidth="1.2" opacity="0.6" />
      <circle className="brand-pin" cx="21.5" cy="10" r="2.6" fill="#fff" />
    </svg>
  )
}
