// Supabase returns plain objects with a `message` rather than real Error
// objects, so read the message from either kind.
export function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return fallback
}
