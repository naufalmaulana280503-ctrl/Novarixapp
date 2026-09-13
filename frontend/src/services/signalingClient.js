import io from 'socket.io-client'
import { resolveSocketUrl } from './backendUrl'

// Railway exposes the API and Socket.IO on the same public service/port.
// A separate URL remains supported for legacy local deployments.
const SOCKET_URL = resolveSocketUrl(
  import.meta.env.VITE_SIGNALING_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_API_ORIGIN
)
const socket = io(SOCKET_URL, {
  // WebSocket-only connections fail behind some reverse proxies. Socket.IO's
  // polling fallback still upgrades to WebSocket when the transport is usable.
  transports: ['polling', 'websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
})

const ensureConnected = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) return false
  socket.auth = { token }
  if (!socket.connected) socket.connect()
  return true
}

const registerCurrentUser = () => {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  if (!raw) return
  try {
    const user = JSON.parse(raw)
    if (user?.id) socket.emit('user:join', { userId: user.id, displayName: user.displayName || user.username })
  } catch {}
}

socket.on('connect', registerCurrentUser)

export default {
  socket,
  connect: () => {
    const connected = ensureConnected()
    if (connected && socket.connected) registerCurrentUser()
    return connected
  },
  on: (ev, cb) => socket.on(ev, cb),
  off: (ev, cb) => socket.off(ev, cb),
  emit: (ev, data, cb) => {
    if (!ensureConnected()) return
    socket.emit(ev, data, cb)
  },
}
