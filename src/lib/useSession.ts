import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isConfigured } from './supabase'

// Current signed-in session, or null. `loading` is true until the first check finishes.
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
