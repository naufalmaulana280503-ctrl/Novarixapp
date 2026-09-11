import { api } from './api'

// The callback route and AuthProvider can observe the same Supabase session.
// Share the backend exchange so a PKCE callback cannot create competing
// requests or overwrite a newer Novarix session.
const syncRequests = new Map()

export const syncSupabaseSession = async (session) => {
  const accessToken = session?.access_token
  if (!accessToken) return null

  const existingRequest = syncRequests.get(accessToken)
  if (existingRequest) return existingRequest

  const request = (async () => {
    try {
      const response = await api.post('/auth/oauth', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      return response.data
    } catch (error) {
      syncRequests.delete(accessToken)
      throw error
    }
  })()

  syncRequests.set(accessToken, request)
  return request
}

export default syncSupabaseSession
