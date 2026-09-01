// Side-effect module to ensure axios Authorization header is always set from localStorage
import { api } from './api'

// Safe interceptor: set Authorization header when token exists
api.interceptors.request.use((config) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      config.headers = { ...(config.headers || {}), Authorization: 'Bearer ' + token }
    }
  } catch (e) {
    // ignore errors reading storage
  }
  return config
}, (error) => Promise.reject(error))
