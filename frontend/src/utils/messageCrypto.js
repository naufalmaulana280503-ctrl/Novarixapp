const PREFIX = 'nvx:v1:'
const APP_KEY = import.meta.env.VITE_CHAT_ENCRYPTION_KEY || 'novarix-chat-at-rest-v1'

const encode = (bytes) => {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0))

const getKey = async (conversationId, userId) => {
  const participants = [String(conversationId), String(userId), APP_KEY].sort().join(':')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(participants))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export const encryptMessageText = async (text, conversationId, userId) => {
  if (!text || !conversationId || !userId || typeof crypto?.subtle === 'undefined') return text
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await getKey(conversationId, userId)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  const payload = new Uint8Array(iv.length + encrypted.byteLength)
  payload.set(iv)
  payload.set(new Uint8Array(encrypted), iv.length)
  return PREFIX + encode(payload)
}

export const decryptMessageText = async (text, conversationId, userId) => {
  if (!text?.startsWith(PREFIX) || !conversationId || !userId || typeof crypto?.subtle === 'undefined') return text
  try {
    const payload = decode(text.slice(PREFIX.length))
    const key = await getKey(conversationId, userId)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: payload.slice(0, 12) }, key, payload.slice(12))
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.warn('Unable to decrypt chat message:', error)
    return '[Encrypted message unavailable]'
  }
}
