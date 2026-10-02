import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isConfigured = Boolean(url && key)
// Placeholder values keep the app loadable before .env.local exists;
// App shows a setup message instead of calling Supabase in that case.
export const supabaseUrl = url ?? 'http://localhost'
export const supabaseKey = key ?? 'missing-key'

export const supabase = createClient(supabaseUrl, supabaseKey)
