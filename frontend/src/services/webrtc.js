const defaultIceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const parseConfiguredIceServers = () => {
  const raw = String(import.meta.env.VITE_ICE_SERVERS || '').trim()
  if (!raw) return defaultIceServers
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultIceServers
    const valid = parsed.filter((server) => server && server.urls)
    return valid.length ? valid : defaultIceServers
  } catch {
    console.warn('[Novarix] VITE_ICE_SERVERS is not valid JSON; using public STUN servers.')
    return defaultIceServers
  }
}

// TURN is required for peers behind restrictive NATs. Configure this with a
// short-lived/ephemeral credential provider in production; never hard-code a
// provider secret in the frontend bundle.
export const ICE_SERVERS = parseConfiguredIceServers()

