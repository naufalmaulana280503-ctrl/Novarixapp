import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))
// Google is the supported first-party social login. Additional providers stay
// opt-in so a button cannot be enabled accidentally before its dashboard
// credentials and redirect settings have been configured.
const configuredOAuthProviders = String(import.meta.env.VITE_ENABLED_OAUTH_PROVIDERS || '')
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean)
const enabledOAuthProviders = new Set(
  configuredOAuthProviders.length ? configuredOAuthProviders : ['google']
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

// The provider still has to be enabled in Supabase; this client-side allowlist
// only controls which Novarix buttons may initiate a redirect.
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
