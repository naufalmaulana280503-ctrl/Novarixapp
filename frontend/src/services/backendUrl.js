const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

const DEFAULT_BACKEND_PORT = Number.parseInt(env.VITE_BACKEND_PORT || '5000', 10) || 5000
// VITE_API_URL is the deployment contract. Keep VITE_API_ORIGIN as a
// backwards-compatible alias for existing local/Capacitor builds.
const EXPLICIT_API_ORIGIN = String(env.VITE_API_URL || env.VITE_API_ORIGIN || '').trim().replace(/\/+$/, '')
const DEFAULT_BACKEND_ORIGIN = EXPLICIT_API_ORIGIN || `http://localhost:${DEFAULT_BACKEND_PORT}`

const IN_BROWSER = typeof window !== 'undefined'

const isLoopbackOrigin = (value) => (
  /^(https?|wss?):\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i.test(String(value || '').trim())
)

export const resolveBackendOrigin = (value, fallback = DEFAULT_BACKEND_ORIGIN) => {
  if (!value || typeof value !== 'string') return fallback

  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed || /:undefined(?:[/?#]|$)/i.test(trimmed)) return fallback

  if (/^https?:\/\//i.test(trimmed) || /^wss?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('//')) {
    return `http:${trimmed}`
  }

  return `http://${trimmed}`
}

export const resolveSocketUrl = (value, fallback = DEFAULT_BACKEND_ORIGIN) => {
  const resolved = resolveBackendOrigin(value, fallback)
  return resolved
}

/**
 * REST calls stay same-origin in the browser whenever the backend lives on the
 * local machine: the Vite dev server proxies `/api` and `/uploads` to Express.
 * This removes the whole class of "Network Error" failures caused by
 * localhost vs 127.0.0.1 mismatches and by the backend CORS allowlist.
 * A non-loopback VITE_API_ORIGIN (staging/production API) is still honoured.
 */
const useSameOrigin = IN_BROWSER && (!EXPLICIT_API_ORIGIN || isLoopbackOrigin(EXPLICIT_API_ORIGIN))

export const API_ORIGIN = useSameOrigin ? '' : resolveBackendOrigin(EXPLICIT_API_ORIGIN)
export const BACKEND_ORIGIN = DEFAULT_BACKEND_ORIGIN
export default API_ORIGIN
