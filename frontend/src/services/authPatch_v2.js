// Side-effect module to ensure axios Authorization header is always set from localStorage
import { api } from './api'

// Safe interceptor: set Authorization header when token exists
api.interceptors.request.use((config) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    // OAuth exchange requests provide the Supabase access token explicitly.
    // Never replace it with the stored Novarix API token.
    if (token && !config.headers?.Authorization) {
      config.headers = { ...(config.headers || {}), Authorization: 'Bearer ' + token }
    }
  } catch (e) {
    // ignore errors reading storage
  }
  return config
}, (error) => Promise.reject(error))
