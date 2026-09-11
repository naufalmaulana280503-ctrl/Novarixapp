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
        // URL processing is explicit in restoreSessionFromUrl(). Leaving the
        // SDK auto-handler enabled would race with exchangeCodeForSession().
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  } catch (err) {
    console.error('[Novarix] Gagal inisialisasi Supabase client:', err)
    supabaseInstance = null
  }
}

export const getSupabase = () => supabaseInstance
export const isSupabaseConfigured = () => isConfigured

let urlRestorePromise = null

const removeOAuthParams = () => {
  if (typeof window === 'undefined') return
  const cleanUrl = new URL(window.location.href)
  cleanUrl.hash = ''
  cleanUrl.searchParams.delete('code')
  cleanUrl.searchParams.delete('error')
  cleanUrl.searchParams.delete('error_code')
  cleanUrl.searchParams.delete('error_description')
  cleanUrl.searchParams.delete('error_uri')
  window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}`)
}

export const restoreSessionFromUrl = () => {
  if (!supabaseInstance || typeof window === 'undefined') {
    return Promise.resolve({ session: null, error: null, handled: false })
  }

  // AuthProvider and /auth/callback can both run during the same render.
  // Share one exchange so a PKCE code is never consumed twice.
  if (urlRestorePromise) return urlRestorePromise

  urlRestorePromise = (async () => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const searchParams = new URLSearchParams(window.location.search)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const authCode = searchParams.get('code')
    const authError = (
      searchParams.get('error_description')
      || searchParams.get('error')
      || hashParams.get('error_description')
      || hashParams.get('error')
    )

    if (authError) {
      removeOAuthParams()
      return { session: null, error: new Error(authError), handled: true }
    }

    if (!((accessToken && refreshToken) || authCode)) {
      return { session: null, error: null, handled: false }
    }

    let result
    try {
      result = accessToken && refreshToken
        ? await supabaseInstance.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        : await supabaseInstance.auth.exchangeCodeForSession(authCode)
    } catch (error) {
      result = { data: { session: null }, error }
    }

    // Remove bearer tokens and one-time PKCE codes from the address bar even
    // when the exchange fails; the caller will show a safe generic error.
    removeOAuthParams()

    return {
      session: result.data?.session || null,
      error: result.error || null,
      handled: true,
    }
  })()

  return urlRestorePromise
}

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
