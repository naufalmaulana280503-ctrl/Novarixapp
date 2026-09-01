import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))
const enabledOAuthProviders = new Set(
  String(import.meta.env.VITE_ENABLED_OAUTH_PROVIDERS || '')
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean)
)

if (!isConfigured) {
  console.warn('[Novarix] Supabase tidak dikonfigurasi. Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY ke file .env untuk mengaktifkan OAuth (Google/Yahoo) dan fitur Supabase lainnya.')
}

let supabaseInstance = null

if (isConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  } catch (err) {
    console.error('[Novarix] Gagal inisialisasi Supabase client:', err)
    supabaseInstance = null
  }
}

export const getSupabase = () => supabaseInstance
export const isSupabaseConfigured = () => isConfigured

// OAuth is opt-in so an enabled Supabase project cannot redirect users to a
// raw provider error page when the provider is disabled in the dashboard.
export const isOAuthProviderEnabled = (provider) => (
  isConfigured && enabledOAuthProviders.has(String(provider || '').trim().toLowerCase())
)

export const supabase = supabaseInstance || {
  auth: {
    signInWithOAuth: async () => {
      throw new Error('Supabase belum dikonfigurasi. Silakan atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.')
    },
    signInWithOtp: async () => {
      throw new Error('Supabase belum dikonfigurasi.')
    },
    verifyOtp: async () => {
      throw new Error('Supabase belum dikonfigurasi.')
    },
    resetPasswordForEmail: async () => {
      throw new Error('Supabase belum dikonfigurasi.')
    },
    updateUser: async () => {
      throw new Error('Supabase belum dikonfigurasi.')
    },
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {},
  },
  from: () => ({
    select: async () => ({ data: null, error: new Error('Supabase belum dikonfigurasi') }),
    insert: async () => ({ data: null, error: new Error('Supabase belum dikonfigurasi') }),
    update: async () => ({ data: null, error: new Error('Supabase belum dikonfigurasi') }),
    upsert: async () => ({ data: null, error: new Error('Supabase belum dikonfigurasi') }),
    delete: async () => ({ data: null, error: new Error('Supabase belum dikonfigurasi') }),
  }),
}

export default supabase
