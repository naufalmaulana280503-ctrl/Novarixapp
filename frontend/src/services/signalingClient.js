import io from 'socket.io-client'
import { resolveSocketUrl } from './backendUrl'

const SOCKET_URL = resolveSocketUrl(import.meta.env.VITE_SIGNALING_URL)
const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
})

const ensureConnected = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) return false
  socket.auth = { token }
  if (!socket.connected) socket.connect()
  return true
}

export default {
  socket,
  connect: ensureConnected,
  on: (ev, cb) => socket.on(ev, cb),
  off: (ev, cb) => socket.off(ev, cb),
  emit: (ev, data, cb) => {
    if (!ensureConnected()) return
    socket.emit(ev, data, cb)
  },
}
