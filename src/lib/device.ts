// Matches the phone layout in index.css (screens up to 600px wide).
export const PHONE_QUERY = '(max-width: 600px)'

export function isPhoneLayout() {
  return window.matchMedia(PHONE_QUERY).matches
}
