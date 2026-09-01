// Side-effect module to ensure axios Authorization header is always set from localStorage
import { api } from './api'

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch (e) {
    // ignore
  }
  return config
}, (error) => Promise.reject(error))
