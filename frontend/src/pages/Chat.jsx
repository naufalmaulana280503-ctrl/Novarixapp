import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { API_ORIGIN } from '../services/backendUrl'
import { useAuth } from '../context/AuthContext'
import NewChatModal from '../components/NewChatModal'
import MessageActions from '../components/MessageActions'
import { useToast } from '../context/ToastContext'
import signaling from '../services/signalingClient'

import {
  MessageCircle, Phone, Video, Plus, Search,
  ArrowLeft, Send, Smile, Paperclip, Image,
  Pin, PhoneOff, Mic, MicOff, Users, MapPin,
  Play, Pause, Download, FileText, X, StopCircle,
} from 'lucide-react'

const STICKERS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏', '🎉', '💯', '👀', '✨']

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatDuration = (sec) => {
  if (!sec) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const Avatar = ({ name, color, size = 40, online = false }) => {
  const initial = (name || '?').charAt(0).toUpperCase()
  const colorClass = color || 'from-sky-400 via-cyan-500 to-emerald-400'
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${colorClass} text-white font-bold shadow`}
        style={{ width: size, height: size, fontSize: Math.max(12, size / 2.5) }}
      >
        {initial}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#101014]" />
      )}
    </div>
  )
}

const fmtTime = (ts) => {
  const fmtDateLabel = (ts) => {
    const date = new Date(ts)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Hari ini'
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const resolveMedia = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

const MessageBubbleContent = ({ m, onPlayVoice }) => {
  if (m.documentUrl) {
    return (
      <a
        href={resolveMedia(m.documentUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 min-w-[240px] hover:brightness-110 transition"
      >
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{m.documentName || 'Dokumen'}</p>
          <p className="text-[11px] opacity-80">{formatBytes(m.documentSize)}</p>
        </div>
        <Download className="w-4 h-4 opacity-80" />
      </a>
    )
  }
  if (m.imageUrl) {
      if (m.videoUrl) {
        return <video src={resolveMedia(m.videoUrl)} controls className="rounded-xl max-w-[300px] max-h-[320px]" />
      }
    return (
      <a href={resolveMedia(m.imageUrl)} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={resolveMedia(m.imageUrl)}
          alt="image"
          className="rounded-xl max-w-[280px] max-h-[320px] object-cover"
          loading="lazy"
        />
      </a>
    )
  }
  if (m.voiceUrl) {
    const dur = m.voiceDuration || 0
    const [playing, setPlaying] = useState(false)
    const audioRef = useRef(null)
    const togglePlay = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio(resolveMedia(m.voiceUrl))
        audioRef.current.addEventListener('ended', () => setPlaying(false))
      }
      if (playing) {
        audioRef.current.pause()
        setPlaying(false)
      } else {
        audioRef.current.currentTime = 0
        audioRef.current.play()
        setPlaying(true)
        onPlayVoice && onPlayVoice(m.id)
      }
    }
    return (
      <div className="flex items-center gap-3 min-w-[220px]">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition shrink-0"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-1.5">
            <div className="h-full w-1/3 bg-white rounded-full" />
          </div>
          <p className="text-[11px] opacity-80 font-mono">{formatDuration(dur)}</p>
        </div>
      </div>
    )
  }
  if (m.locationName && m.latitude != null && m.longitude != null) {
    const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${m.latitude},${m.longitude}`)}`
    return (
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block hover:brightness-110 transition">
        <div className="flex items-center gap-3 min-w-[240px]">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/30 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <MapPin className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Lokasi</p>
            <p className="text-[11px] opacity-80 truncate">{m.locationName}</p>
          </div>
        </div>
      </a>
    )
  }
  if (m.sticker && !m.text) {
    return <span className="text-5xl">{m.sticker}</span>
  }
  return <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
}

const Chat = () => {
  const { userId } = useParams()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showStickers, setShowStickers] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [typingText, setTypingText] = useState('')
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()
  const [showNewChat, setShowNewChat] = useState(false)
  const [query, setQuery] = useState('')
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)

  const [chatTab, setChatTab] = useState('dms')

  // Voice recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const mediaRecorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const recordedChunksRef = useRef([])

  // File inputs refs
  const docInputRef = useRef(null)
  const imgInputRef = useRef(null)

  // ===== Call state (DM voice/video) =====
  const [activeCall, setActiveCall] = useState(null)
  const [callElapsed, setCallElapsed] = useState(0)
  const [callMicOn, setCallMicOn] = useState(true)
  const [callCamOn, setCallCamOn] = useState(false)
  const callTimerRef = useRef(null)
  const peerVideoRef = useRef(null)
  const selfVideoRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])

  // ============ SCROLL TO BOTTOM ON NEW MESSAGES ============
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ============ FETCH CONVERSATIONS ON MOUNT ============
  useEffect(() => {
    fetchConversations()
    if (currentUser?.id) {
      try {
        signaling.emit('user:join', {
          userId: currentUser.id,
          displayName: currentUser.displayName || currentUser.username,
        })
      } catch (e) { console.warn('socket user:join error', e) }
    }
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
      }
      if (pcRef.current) { try { pcRef.current.close() } catch {} pcRef.current = null }
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============ ONLINE / OFFLINE PRESENCE LISTENERS ============
  useEffect(() => {
    const onOnline = ({ userId: uid }) => {
      setOnlineUsers(prev => new Set([...prev, String(uid)]))
    }
    const onOffline = ({ userId: uid }) => {
      setOnlineUsers(prev => {
        const n = new Set(prev); n.delete(String(uid)); return n
      })
    }
    signaling.on('presence:online', onOnline)
    signaling.on('presence:offline', onOffline)
    return () => {
      signaling.off('presence:online', onOnline)
      signaling.off('presence:offline', onOffline)
    }
  }, [])

  // ============ TYPING INDICATORS ============
  useEffect(() => {
    const h = ({ fromUserId, isTyping, fromDisplayName, conversationId }) => {
      if (selectedConversation && String(fromUserId) === String(selectedConversation)) {
        setTypingText(isTyping ? `${fromDisplayName || 'Seseorang'} mengetik...` : '')
        if (isTyping) {
          setTimeout(() => setTypingText(''), 3000)
        }
      }
    }
    signaling.on('chat:typing', h)
    return () => signaling.off('chat:typing', h)
  }, [selectedConversation])

  // ============ HANDLE INCOMING DM MESSAGES VIA SOCKET ============
  useEffect(() => {
    const onNewDM = ({ fromUserId, fromDisplayName, message, timestamp }) => {
      const fuid = String(fromUserId)
      if (selectedConversation && String(selectedConversation) === fuid) {
        setMessages(prev => {
          if (prev.some(m => String(m.senderId) === fuid && m.text === message && Math.abs(new Date(m.createdAt || 0) - new Date(timestamp)) < 2000)) return prev
          return [...prev, {
            id: 'rt_' + timestamp + '_' + Math.random().toString(36).slice(2, 7),
            senderId: fromUserId,
            senderDisplayName: fromDisplayName,
            text: message,
            createdAt: new Date(timestamp).toISOString(),
            isRealtime: true,
          }]
        })
      } else {
        setConversations(prev => {
          const others = prev.filter(c => String(c.userId) !== fuid)
          const existing = prev.find(c => String(c.userId) === fuid)
          const updated = existing ? {
            ...existing,
            lastMessage: message,
            lastMessageAt: new Date(timestamp).toISOString(),
            unreadCount: (existing.unreadCount || 0) + 1,
          } : {
            userId: fromUserId,
            displayName: fromDisplayName || 'Unknown',
            avatarColor: 'from-sky-400 via-cyan-500 to-emerald-400',
            lastMessage: message,
            lastMessageAt: new Date(timestamp).toISOString(),
            unreadCount: 1,
          }
          return [updated, ...others]
        })
      }
    }
    signaling.on('chat:newDM', onNewDM)
    return () => signaling.off('chat:newDM', onNewDM)
  }, [selectedConversation])

  // ============ SELECT CONVERSATION WHEN URL CHANGES ============
  useEffect(() => {
    if (userId) {
      fetchMessages(userId)
      setSelectedConversation(userId)
    }
  }, [userId])

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations')
      setConversations(res.data.conversations || [])
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (targetUserId) => {
    try {
      const res = await api.get(`/chat/messages/${targetUserId}`)
      const msgs = (res.data.messages || []).slice().reverse()
      setMessages(msgs)
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }

  const uploadChatFile = async (file) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/chat/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    } finally {
      setUploading(false)
    }
  }

  const sendPayload = async (payload) => {
      const res = await api.post(`/chat/messages/${selectedConversation}`, { ...payload, replyToId: replyingTo?.id || payload.replyToId || null })
    if (!selectedConversation) return
    setSending(true)
    const temporaryId = 'opt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const optimistic = {
      id: temporaryId,
      senderId: currentUser?.id,
      senderDisplayName: currentUser?.displayName,
      createdAt: new Date().toISOString(),
      isMine: true,
      isPending: true,
      ...payload,
    }
    setMessages(prev => [...prev, optimistic])
    setNewMessage('')
    setShowStickers(false)
    setShowAttachMenu(false)

    try {
      const res = await api.post(`/chat/messages/${selectedConversation}`, payload)
      setMessages(prev => prev.map(m => m.id === temporaryId
        ? { ...m, ...(res.data || {}), id: res.data?.id || m.id, isPending: false, sent: true }
        : m))
      setReplyingTo(null)
      try {
        const previewText =
          payload.text ||
          (payload.documentUrl ? `📄 ${payload.documentName || 'Dokumen'}` : '') ||
          (payload.imageUrl ? '🖼️ Gambar' : '') ||
          (payload.voiceUrl ? `🎤 Voice Note ${formatDuration(payload.voiceDuration)}` : '') ||
          (payload.locationName ? `📍 ${payload.locationName}` : '') ||
          ''
        if (previewText) signaling.emit('chat:sendDM', { receiverId: selectedConversation, message: previewText })
      } catch {}
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => prev.map(m => m.id === temporaryId ? { ...m, isPending: false, isError: true } : m))
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal kirim pesan' })
    } finally {
      setSending(false)

      const editMessage = async (message) => {
        const text = message.text !== undefined ? message.text : window.prompt('Edit pesan', '')
        if (!text || text.trim() === message.text) return
        try {
          const { data } = await api.put(`/chat/messages/${message.id}`, { text: text.trim() })
          setMessages(prev => prev.map(item => item.id === message.id ? { ...item, text: data.text, editedAt: data.editedAt } : item))
        } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal edit pesan' }) }
      }

      const deleteMessage = async (message) => {
        if (!window.confirm('Hapus pesan ini?')) return
        try {
          await api.delete(`/chat/messages/${message.id}`)
          setMessages(prev => prev.map(item => item.id === message.id ? { ...item, text: 'Pesan telah dihapus', deletedAt: new Date().toISOString(), imageUrl: null, videoUrl: null, voiceUrl: null, documentUrl: null, locationName: null } : item))
        } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal hapus pesan' }) }
      }

      const reportMessage = async (message, category, details) => {
        try { await api.post('/reports', { category, details, targetMessageId: message.id }); addToast({ type: 'success', text: 'Laporan terkirim' }) }
        catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal mengirim laporan' }) }
      }
    }
  }

  const deleteMessageForMe = (message) => {
    setMessages(prev => prev.filter(item => item.id !== message.id))
  }

  const handleSendMessage = async (e) => {
        if (editingMessage) {
          await editMessage({ ...editingMessage, text: newMessage.trim() })
          setEditingMessage(null)
          setNewMessage('')
          return
        }
        await sendPayload({ text: newMessage.trim() })
    if (e) e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return
    await sendPayload({ text: newMessage.trim() })
  }

  const handleSendSticker = async (stk) => {
    if (!selectedConversation) return
    setSending(true)
    const temporaryId = 'opt_stk_' + Date.now()
    setMessages(prev => [...prev, {
      id: temporaryId,
      senderId: currentUser?.id,
      sticker: stk,
      createdAt: new Date().toISOString(),
      isMine: true,
      isPending: true,
    }])
    setShowStickers(false)
    try {
      await api.post(`/chat/messages/${selectedConversation}`, { text: stk })
      setMessages(prev => prev.map(m => m.id === temporaryId ? { ...m, isPending: false } : m))
      try { signaling.emit('chat:sendDM', { receiverId: selectedConversation, message: stk }) } catch {}
    } catch {
      addToast({ type: 'error', text: 'Gagal kirim stiker' })
    } finally {
      setSending(false)
    }
  }

  const handleFilePick = async (file, kind) => {
    if (!file) return
    try {
      const up = await uploadChatFile(file)
      if (!up?.url) return
      if (up.type === 'image' || kind === 'image') {
        await sendPayload({ imageUrl: up.url, text: newMessage.trim() || null })
      } else if (up.type === 'video' || kind === 'video') {
        await sendPayload({ videoUrl: up.url, text: newMessage.trim() || null })
      } else if (up.type === 'voice') {
        // will be handled separately via recorder
      } else {
        await sendPayload({
          documentUrl: up.url,
          documentName: up.name || file.name,
          documentSize: up.size || file.size,
          text: newMessage.trim() || null,
        })
      }
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal upload file' })
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      recordedChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const dur = recordDuration
        setIsRecording(false)
        setRecordDuration(0)
        if (recordTimerRef.current) clearInterval(recordTimerRef.current)
        if (recordedChunksRef.current.length === 0 || dur < 1) {
          addToast({ type: 'info', text: 'Rekaman terlalu pendek' })
          return
        }
        const mime = mr.mimeType || 'audio/webm'
        const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp3') ? 'mp3' : 'webm'
        const blob = new Blob(recordedChunksRef.current, { type: mime })
        const file = new File([blob], `voice-note.${ext}`, { type: mime })
        try {
          const up = await uploadChatFile(file)
          if (!up?.url) return
          await sendPayload({ voiceUrl: up.url, voiceDuration: dur })
        } catch (err) {
          addToast({ type: 'error', text: 'Gagal kirim voice note' })
        }
      }
      mr.start()
      setIsRecording(true)
      setRecordDuration(0)
      const startTs = Date.now()
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(Math.floor((Date.now() - startTs) / 1000))
      }, 500)
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: 'Gagal mulai merekam: ' + (err?.message || 'Izin mic ditolak') })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      recordedChunksRef.current = []
      mediaRecorderRef.current.onstop = () => {}
      try { mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()) } catch {}
      mediaRecorderRef.current.stop()
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    setIsRecording(false)
    setRecordDuration(0)
  }

  const sendLocation = async () => {
    if (!navigator.geolocation) {
      addToast({ type: 'error', text: 'Browser tidak mendukung Geolocation' })
      return
    }
    setUploading(true)
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      })
      const { latitude, longitude } = pos.coords
      const label = `Lokasi (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
      await sendPayload({ locationName: label, latitude, longitude })
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: 'Gagal mendapatkan lokasi: ' + (err?.message || 'Izin ditolak') })
    } finally {
      setUploading(false)
      setShowAttachMenu(false)
    }
  }

  const handleSelectConversation = (convUserId) => {
    setSelectedConversation(convUserId)
    setConversations(prev => prev.map(c => String(c.userId) === String(convUserId) ? { ...c, unreadCount: 0 } : c))
    navigate(`/chat/${convUserId}`)
  }

  // ============ FILTER CONVERSATIONS BY SEARCH ============
  const filteredConversations = conversations.filter(c => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (c.displayName || '').toLowerCase().includes(q)
      || (c.username || '').toLowerCase().includes(q)
      || (c.lastMessage || '').toLowerCase().includes(q)
  })

  // ============ WEBRTC CALL HELPERS ============
  const startCall = useCallback(async (type, targetUserId, targetDisplayName) => {
    try {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      if (pcRef.current) { try { pcRef.current.close() } catch {} }
      const constraints = {
        audio: true,
        video: type === 'video'
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      if (selfVideoRef.current && type === 'video') selfVideoRef.current.srcObject = stream

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      })
      pcRef.current = pc

      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      pc.ontrack = (ev) => {
        if (peerVideoRef.current && ev.streams?.[0]) {
          peerVideoRef.current.srcObject = ev.streams[0]
        }
      }
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return
        try { signaling.emit('call:ice', { roomId: activeCall?.roomId || callRoomId, candidate: ev.candidate }) } catch {}
      }
      pendingCandidatesRef.current = []
      pc.onnegotiationneeded = async () => {}

      const callRoomId = 'call_dm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      setCallCamOn(type === 'video')
      setCallMicOn(true)
      setCallElapsed(0)
      const initial = {
        type,
        roomId: callRoomId,
        targetUserId,
        targetDisplayName,
        status: 'calling',
        startedAt: null,
        role: 'initiator',
      }
      setActiveCall(initial)

      try {
        signaling.emit('call:start', {
          callId: callRoomId,
          type,
          roomId: callRoomId,
          targetUserId,
          offer,
          initiatorInfo: {
            userId: currentUser?.id,
            displayName: currentUser?.displayName,
          },
        })
      } catch (e) { console.warn('call:start error', e) }

      const acceptTimeout = setTimeout(() => {
        setActiveCall(prev => prev?.status === 'calling' ? { ...prev, status: 'connected', startedAt: Date.now() } : prev)
        const startTs = Date.now()
        callTimerRef.current = setInterval(() => {
          setCallElapsed(Math.floor((Date.now() - startTs) / 1000))
        }, 1000)
      }, 3000)

      const onAnswered = ({ roomId, answer }) => {
        if (roomId !== callRoomId) return
        clearTimeout(acceptTimeout)
        if (pc && answer && !pc.currentRemoteDescription) {
          try {
            pc.setRemoteDescription(new RTCSessionDescription(answer))
            pendingCandidatesRef.current.forEach(c => { try { pc.addIceCandidate(new RTCIceCandidate(c)) } catch {} })
            pendingCandidatesRef.current = []
          } catch (e) { console.warn('set remote desc error', e) }
        }
        setActiveCall(prev => ({ ...(prev || initial), status: 'connected', startedAt: Date.now(), role: 'initiator' }))
        const startTs = Date.now()
        if (callTimerRef.current) clearInterval(callTimerRef.current)
        callTimerRef.current = setInterval(() => {
          setCallElapsed(Math.floor((Date.now() - startTs) / 1000))
        }, 1000)
        signaling.off('call:answered', onAnswered)
      }
      signaling.on('call:answered', onAnswered)

      const onIce = ({ roomId, candidate }) => {
        if (roomId !== callRoomId) return
        if (!candidate) return
        if (pc && pc.currentRemoteDescription) {
          try { pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch (e) {}
        } else {
          pendingCandidatesRef.current.push(candidate)
        }
      }
      signaling.on('call:ice', onIce)

      const onEnded = ({ roomId }) => {
        if (roomId !== callRoomId) return
        endCallInternal(true)
        signaling.off('call:ended', onEnded)
        signaling.off('call:answered', onAnswered)
        signaling.off('call:ice', onIce)
      }
      signaling.on('call:ended', onEnded)

    } catch (err) {
      console.error('startCall error:', err)
      addToast({ type: 'error', text: 'Gagal memulai panggilan: ' + (err?.message || 'Izin kamera/mic ditolak') })
      endCallInternal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall, currentUser])

  useEffect(() => {
    const handler = ({ callId, type, roomId, offer, fromUserId, fromSocket, initiatorInfo }) => {
      if (String(fromUserId) === String(currentUser?.id)) return
      if (selectedConversation && String(fromUserId) !== String(selectedConversation)) {
        addToast({ type: 'info', text: `Panggilan masuk dari ${initiatorInfo?.displayName || 'Seseorang'}` })
      }
      setTimeout(async () => {
        try {
          const constraints = { audio: true, video: type === 'video' }
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          localStreamRef.current = stream
          if (selfVideoRef.current && type === 'video') selfVideoRef.current.srcObject = stream

          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ]
          })
          pcRef.current = pc
          stream.getTracks().forEach(track => pc.addTrack(track, stream))
          pc.ontrack = (ev) => {
            if (peerVideoRef.current && ev.streams?.[0]) {
              peerVideoRef.current.srcObject = ev.streams[0]
            }
          }
          pc.onicecandidate = (ev) => {
            if (!ev.candidate) return
            try { signaling.emit('call:ice', { roomId, candidate: ev.candidate, toSocket: fromSocket }) } catch {}
          }
          if (offer) await pc.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          signaling.emit('call:answer', { roomId, answer, toSocket: fromSocket })
          setCallCamOn(type === 'video')
          setCallMicOn(true)
          setCallElapsed(0)
          setActiveCall({
            type, roomId, status: 'connected', startedAt: Date.now(), role: 'receiver',
            targetUserId: fromUserId, targetDisplayName: initiatorInfo?.displayName || 'Penelepon',
          })
          const startTs = Date.now()
          if (callTimerRef.current) clearInterval(callTimerRef.current)
          callTimerRef.current = setInterval(() => {
            setCallElapsed(Math.floor((Date.now() - startTs) / 1000))
          }, 1000)
          addToast({ type: 'success', text: `Panggilan ${type === 'video' ? 'video' : 'suara'} diterima` })
        } catch (e) {
          console.warn('auto-answer call error', e)
        }
      }, 1500)
    }
    signaling.on('call:incoming', handler)
    return () => signaling.off('call:incoming', handler)
  }, [selectedConversation, currentUser, addToast])

  useEffect(() => {
    const h = ({ roomId }) => {
      if (!activeCall) return
      if (roomId === activeCall.roomId) endCallInternal(true)
    }
    signaling.on('call:ended', h)
    return () => signaling.off('call:ended', h)
  }, [activeCall])

  const endCallInternal = (remoteInitiated = false) => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    if (!remoteInitiated && activeCall?.roomId) {
      try { signaling.emit('call:end', { roomId: activeCall.roomId, reason: 'ended' }) } catch {}
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (selfVideoRef.current) selfVideoRef.current.srcObject = null
    if (peerVideoRef.current) peerVideoRef.current.srcObject = null
    if (pcRef.current) { try { pcRef.current.close() } catch {}; pcRef.current = null }
    setActiveCall(null)
    setCallElapsed(0)
  }

  const endCall = () => endCallInternal(false)

  const fmtDuration = (s) => {
    if (!s) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0e] text-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-neutral-800 border-t-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="chat-page h-screen w-full bg-[#0b0b0e] text-white flex overflow-hidden">

      <aside className={`chat-sidebar ${selectedConversation ? 'chat-sidebar--hidden-mobile' : ''} w-full sm:w-[340px] shrink-0 h-full border-r border-neutral-800/70 bg-[#101014] flex flex-col`}>
        <div className="px-4 py-4 border-b border-neutral-800/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 nova-gradient-text" />
              <h1 className="font-bold tracking-tight text-lg nova-gradient-text nova-animate-gradient">
                {chatTab === 'dms' ? 'Pesan Pribadi' : chatTab === 'groups' ? 'Grup' : 'Panggilan'}
              </h1>
            </div>
            <button
              onClick={() => {
                if (chatTab === 'dms') setShowNewChat(true)
                else if (chatTab === 'groups') navigate('/groups')
                else navigate('/calls')
              }}
              title={chatTab === 'dms' ? 'Chat baru' : chatTab === 'groups' ? 'Grup baru' : 'Riwayat panggilan'}
              className="w-9 h-9 rounded-xl nova-gradient-bg nova-animate-gradient flex items-center justify-center hover:brightness-110 transition shadow"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1a1a20] border border-neutral-800 mb-3" role="tablist" aria-label="Chat sections">
            <button
              type="button"
              role="tab"
              aria-selected={chatTab === 'dms'}
              onClick={() => { setChatTab('dms'); setSelectedConversation(null); navigate('/chat') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                chatTab === 'dms'
                  ? 'bg-[#101014] text-white shadow border border-neutral-700'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="sm:hidden">DM</span>
              <span className="hidden sm:inline">Pesan</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chatTab === 'groups'}
              onClick={() => { setChatTab('groups'); setSelectedConversation(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                chatTab === 'groups'
                  ? 'bg-[#101014] text-white shadow border border-neutral-700'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Grup</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chatTab === 'calls'}
              onClick={() => { setChatTab('calls'); setSelectedConversation(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                chatTab === 'calls'
                  ? 'bg-[#101014] text-white shadow border border-neutral-700'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Calls</span>
            </button>
          </div>
          {chatTab === 'dms' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari percakapan..."
                className="w-full bg-[#1a1a20] border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 transition"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chatTab === 'groups' ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-sky-400" />
              </div>
              <p className="text-neutral-300 font-semibold mb-1">Grup Chat</p>
              <p className="mb-5">Belum ada grup. Buat grup untuk ngobrol bareng temen-temen!</p>
              <button
                onClick={() => navigate('/groups')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl nova-gradient-bg nova-animate-gradient text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Grup
              </button>
            </div>
          ) : chatTab === 'calls' ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-neutral-300 font-semibold mb-1">Riwayat Panggilan</p>
              <p className="mb-5">Belum ada riwayat panggilan suara / video.</p>
              <button
                onClick={() => navigate('/calls')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl nova-gradient-bg nova-animate-gradient text-white text-xs font-semibold"
              >
                <Phone className="w-3.5 h-3.5" /> Halaman Calls
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              <p>Tidak ada percakapan</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl nova-gradient-bg nova-animate-gradient text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Mulai Chat
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredConversations.map((conv) => {
                const active = String(selectedConversation) === String(conv.userId)
                return (
                  <li key={conv.userId}>
                    <button
                      onClick={() => handleSelectConversation(conv.userId)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition ${
                        active ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Avatar
                        name={conv.displayName}
                        color={conv.avatarColor}
                        size={46}
                        online={onlineUsers.has(String(conv.userId))}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-semibold text-sm truncate pr-2">{conv.displayName}</h3>
                          <span className="text-[10px] text-neutral-500 shrink-0">{fmtTime(conv.lastMessageAt)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-neutral-400 truncate">{conv.lastMessage || 'Mulai percakapan...'}</p>
                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full nova-gradient-bg nova-animate-gradient text-[10px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {showNewChat && (
          <NewChatModal
            open={showNewChat}
            onClose={() => setShowNewChat(false)}
            onCreated={(conv) => {
              setShowNewChat(false)
              if (conv?.userId) navigate(`/chat/${conv.userId}`)
              else if (conv?.id) navigate(`/chat/${conv.id}`)
            }}
          />
        )}
      </aside>

      <section className={`chat-main ${!selectedConversation ? 'chat-main--empty' : ''} flex-1 h-full flex flex-col min-w-0 bg-[#0b0b0e]`}>
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500/20 via-cyan-500/20 to-emerald-500/20 border border-neutral-800 flex items-center justify-center mb-5">
              <MessageCircle className="w-10 h-10 nova-gradient-text" />
            </div>
            <h2 className="text-xl font-bold mb-2">Pilih percakapan untuk mulai chat</h2>
            <p className="text-neutral-400 max-w-sm text-sm mb-6">
              Pilih teman dari daftar di sebelah kiri, atau buat chat baru untuk mengirim pesan teks, stiker, dokumen, lokasi, voice note, dan lakukan panggilan suara / video.
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl nova-gradient-bg nova-animate-gradient font-semibold hover:brightness-110 transition text-sm text-white"
            >
              <Plus className="w-4 h-4" /> Chat Baru
            </button>
          </div>
        ) : (
          <>
            <header className="h-[72px] shrink-0 px-4 sm:px-6 flex items-center gap-4 border-b border-neutral-800/70 bg-[#101014]">
              <button
                onClick={() => navigate('/chat')}
                className="sm:hidden w-9 h-9 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <Avatar
                name={conversations.find(c => String(c.userId) === String(selectedConversation))?.displayName || 'Teman'}
                color={conversations.find(c => String(c.userId) === String(selectedConversation))?.avatarColor}
                size={48}
                online={onlineUsers.has(String(selectedConversation))}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-base truncate">
                    {conversations.find(c => String(c.userId) === String(selectedConversation))?.displayName || 'Percakapan'}
                  </h2>
                </div>
                <div className="text-xs text-neutral-400">
                  {typingText ? (
                    <span className="text-emerald-400">● {typingText}</span>
                  ) : onlineUsers.has(String(selectedConversation)) ? (
                    <span className="text-emerald-400">● Online</span>
                  ) : (
                    <span>Offline</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const tgt = conversations.find(c => String(c.userId) === String(selectedConversation))
                    startCall('voice', selectedConversation, tgt?.displayName || 'Teman')
                  }}
                  className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition flex items-center justify-center"
                  title="Voice Call"
                >
                  <Phone className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => {
                    const tgt = conversations.find(c => String(c.userId) === String(selectedConversation))
                    startCall('video', selectedConversation, tgt?.displayName || 'Teman')
                  }}
                  className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 transition flex items-center justify-center"
                  title="Video Call"
                >
                  <Video className="w-4.5 h-4.5" />
                </button>
                <button
                  className="w-10 h-10 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 border border-transparent transition flex items-center justify-center"
                  title="Pinned"
                >
                  <Pin className="w-4.5 h-4.5" />
                </button>
              </div>
            </header>

            <div
              className="flex-1 overflow-y-auto px-4 sm:px-8 py-5"
              style={{
                backgroundColor: '#0d1418',
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            >
              <div className="max-w-xl mx-auto mb-6 px-4 py-2.5 rounded-xl nova-gradient-border text-center">
                <p className="text-[11px] text-neutral-300/90 inline-flex items-center gap-1.5">
                  <Pin className="w-3 h-3 nova-gradient-text" />
                  <span className="nova-gradient-text">Novarix Direct Message</span> · Aman & terenkripsi end-to-end.
                </p>
              </div>

              <ul className="max-w-3xl mx-auto space-y-3">
                {messages.length === 0 ? (
                  <li className="text-center py-10">
                    <div className="w-16 h-16 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
                      <MessageCircle className="w-7 h-7 text-neutral-600" />
                    </div>
                    <p className="text-neutral-500 text-sm">Belum ada pesan. Mulai mengirim pesan pertama!</p>
                  </li>
                ) : null}
                {messages.map((m, idx) => {
                  const prev = messages[idx - 1]
                  const mine = String(m.senderId) === String(currentUser?.id)
                  const showAvatar = !mine && (!prev || String(prev.senderId) !== String(m.senderId))
                  const senderName = mine ? (currentUser?.displayName || 'Kamu') : (m.senderDisplayName || conversations.find(c => String(c.userId) === String(m.senderId))?.displayName || 'Pengguna')
                  return (
                    <li key={m.id || idx} className={`flex gap-2.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && (
                        <div className="w-8 shrink-0">
                          {showAvatar ? (
                            <Avatar name={senderName} color="from-sky-400 via-cyan-500 to-emerald-400" size={32} />
                          ) : null}
                        </div>
                      )}
                      <div className={`flex flex-col max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
                        {(!prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()) && <div className="self-center mb-2 px-3 py-1 rounded-lg bg-neutral-800 text-[10px] text-neutral-400">{fmtDateLabel(m.createdAt)}</div>}
                        {!mine && showAvatar && (
                          <span className="text-[10px] text-neutral-400 font-semibold mb-1 px-1">{senderName}</span>
                        )}
                        <div className="flex items-center gap-1">
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl shadow-sm ${
                            mine
                              ? 'nova-gradient-bg nova-animate-gradient text-white rounded-br-sm'
                              : 'bg-[#1a1a20] text-neutral-100 border border-neutral-800 rounded-bl-sm'
                          }`}
                        >
                          {m.deletedAt ? <p className="text-xs italic text-neutral-400">Pesan telah dihapus</p> : <>{m.replyToId && <div className="mb-2 border-l-2 border-white/40 pl-2 text-[10px] opacity-70">Membalas pesan</div>}<MessageBubbleContent m={m} /></>}
                        </div>
                        <MessageActions message={m} canEdit={mine && !m.deletedAt} onReply={setReplyingTo} onEdit={(message) => { setEditingMessage(message); setNewMessage(message.text || '') }} onDeleteForMe={deleteMessageForMe} onDeleteForEveryone={deleteMessage} onReport={reportMessage} />
                        </div>
                        <span className="text-[10px] text-neutral-500 mt-1 px-1 inline-flex items-center gap-1">
                          {fmtTime(m.createdAt)} {m.editedAt && <span>(diedit)</span>}
                          {mine && (m.isPending ? <span className="text-neutral-500">· mengirim...</span> : m.isError ? <span className="text-red-400">· gagal</span> : <span className="text-emerald-400">· ✓✓</span>)}
                        </span>
                      </div>
                    </li>
                  )
                })}
                <div ref={messagesEndRef} />
              </ul>
            </div>

            <form onSubmit={handleSendMessage} className="shrink-0 px-3 sm:px-5 py-3 border-t border-neutral-800/70 bg-[#101014]">
              <div className="flex items-end gap-2 max-w-4xl mx-auto relative">
                {replyingTo && <div className="absolute -top-10 left-0 right-0 flex items-center justify-between rounded-lg bg-sky-500/10 border border-sky-500/30 px-3 py-2 text-xs"><span>Membalas: {replyingTo.text || 'lampiran'}</span><button type="button" onClick={() => setReplyingTo(null)} title="Batal membalas"><X className="w-3.5 h-3.5" /></button></div>}
                {editingMessage && <div className="absolute -top-10 left-0 right-0 flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs"><span>Mengedit pesan</span><button type="button" onClick={() => { setEditingMessage(null); setNewMessage('') }} title="Batal edit"><X className="w-3.5 h-3.5" /></button></div>}
                {/* Recording bar */}
                {isRecording && (
                  <div className="absolute -top-14 left-0 right-0 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-sm font-semibold text-cyan-200">Merekam voice note...</span>
                    <span className="font-mono text-cyan-200 text-sm">{formatDuration(recordDuration)}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs"
                      >
                        <X className="w-3.5 h-3.5" /> Batal
                      </button>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold"
                      >
                        <StopCircle className="w-3.5 h-3.5" /> Kirim
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0 relative">
                  <button
                    type="button"
                    onClick={() => { setShowAttachMenu(v => !v); setShowStickers(false) }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                      showAttachMenu
                        ? 'nova-gradient-bg nova-animate-gradient text-white shadow'
                        : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title="Lampirkan"
                  >
                    <Paperclip className="w-5 h-5 -rotate-45" />
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 z-20 w-52 rounded-2xl border border-neutral-800 bg-[#1a1a20] shadow-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { imgInputRef.current?.click() }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3"
                      >
                        <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center">
                          <Image className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-xs">Gambar</p>
                          <p className="text-[10px] text-neutral-500">JPG, PNG, GIF, WEBP</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { docInputRef.current?.click() }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3"
                      >
                        <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-xs">Dokumen</p>
                          <p className="text-[10px] text-neutral-500">PDF, DOC, XLS, PPT, ZIP, TXT</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={sendLocation}
                        disabled={uploading}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 disabled:opacity-60"
                      >
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-xs">Lokasi</p>
                          <p className="text-[10px] text-neutral-500">Kirim lokasi saat ini</p>
                        </div>
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { imgInputRef.current?.click() }}
                    className="w-10 h-10 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition"
                    title="Gambar"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                </div>

                {/* Voice record button (replaces mic when empty) */}
                {!newMessage.trim() ? (
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); startRecording() }}
                    onMouseUp={(e) => { e.preventDefault(); if (isRecording) stopRecording() }}
                    onMouseLeave={() => { if (isRecording) stopRecording() }}
                    onTouchStart={(e) => { e.preventDefault(); startRecording() }}
                    onTouchEnd={(e) => { e.preventDefault(); if (isRecording) stopRecording() }}
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition ${
                      isRecording
                        ? 'bg-cyan-500 text-white animate-pulse shadow-lg shadow-cyan-500/30'
                        : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title="Tahan untuk merekam voice note"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                ) : null}

                <div className="flex-1 relative">
                  <textarea
                    rows={1}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      try { signaling.emit('chat:typing', { toUserId: selectedConversation, isTyping: true, conversationId: selectedConversation }) } catch {}
                    }}
                    onBlur={() => {
                      try { signaling.emit('chat:typing', { toUserId: selectedConversation, isTyping: false, conversationId: selectedConversation }) } catch {}
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Ketik pesan... (Enter kirim, Shift+Enter baris baru; tahan 🎤 untuk voice note)"
                    className="w-full resize-none bg-[#1a1a20] border border-neutral-800 rounded-2xl pl-4 pr-11 py-3 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 transition"
                    style={{ maxHeight: 140, lineHeight: 1.4 }}
                  />
                  <button
                    type="button"
                    onClick={() => { setShowStickers(v => !v); setShowAttachMenu(false) }}
                    className="absolute right-3 bottom-2.5 text-neutral-500 hover:text-cyan-400 transition"
                    title="Emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending || uploading || isRecording}
                  className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition shadow-lg ${
                    !newMessage.trim() || sending || uploading || isRecording
                      ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                      : 'nova-gradient-bg nova-animate-gradient text-white hover:brightness-110 shadow-cyan-500/30'
                  }`}
                  title="Kirim"
                >
                  {sending || uploading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>

                <input
                  ref={docInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFilePick(f, 'doc')
                    e.target.value = ''
                  }}
                />
                <input
                  ref={imgInputRef}
                  type="file"
                  className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                        if (f) handleFilePick(f, f.type.startsWith('video/') ? 'video' : 'image')
                    e.target.value = ''
                  }}
                />
              </div>

              {showStickers && (
                <div className="max-w-4xl mx-auto mt-3 p-3 bg-[#1a1a20] rounded-2xl border border-neutral-800">
                  <div className="flex flex-wrap gap-2">
                    {STICKERS.map(stk => (
                      <button
                        key={stk}
                        type="button"
                        onClick={() => handleSendSticker(stk)}
                        className="text-3xl p-2 rounded-xl hover:bg-neutral-800/60 transition"
                      >
                        {stk}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </>
        )}
      </section>

      {/* ============ CALL OVERLAY (voice / video) ============ */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            style={{
              background: activeCall.type === 'video' && callCamOn
                ? 'radial-gradient(ellipse at top, rgba(56,189,248,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(52,211,153,0.12), transparent 60%), #05060a'
                : 'radial-gradient(ellipse at top, rgba(8,145,178,0.1), transparent 60%), #05060a',
            }}
          >
            <div className="px-6 pt-6 pb-3 flex items-start justify-between">
              <div className="text-xs text-neutral-400">
                Panggilan {activeCall.type === 'video' ? 'Video' : 'Suara'} (DM)
                <div className="mt-0.5 text-neutral-500">
                  Dengan: {activeCall.targetDisplayName || 'Teman'} · {activeCall.status === 'calling' ? 'Menghubungi...' : activeCall.status === 'connected' ? 'Terhubung' : 'Berakhir'}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                <span className={`w-1.5 h-1.5 rounded-full ${activeCall.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400 animate-ping'}`} />
                {activeCall.status === 'calling' ? 'Memanggil' : 'Terhubung'}
              </span>
            </div>

            <div className="px-6 pb-4">
              {activeCall.type === 'video' && callCamOn ? (
                <div className="aspect-video rounded-2xl bg-[#0d1418] border border-white/10 flex items-center justify-center mb-5 overflow-hidden relative">
                  <video ref={peerVideoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover absolute inset-0 bg-black" />
                  <div className="absolute bottom-3 right-3 w-36 h-24 rounded-xl border border-white/15 overflow-hidden shadow-2xl bg-black">
                    <video ref={selfVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    {!localStreamRef.current && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-800/50 to-cyan-800/50">
                        <Avatar name={currentUser?.displayName || 'Kamu'} color="from-sky-400 via-cyan-500 to-emerald-400" size={48} />
                      </div>
                    )}
                  </div>
                  {!localStreamRef.current && (
                    <div className="relative text-center">
                      <Avatar name={activeCall.targetDisplayName || 'Teman'} color="from-sky-400 via-cyan-500 to-emerald-400" size={96} />
                      <p className="mt-3 text-white/80 text-sm">Menghubungkan video...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center mb-2">
                  <div className="relative mb-6">
                    <Avatar name={activeCall.targetDisplayName || 'Teman'} color="from-sky-400 via-cyan-500 to-emerald-400" size={148} />
                    <span className="absolute inset-0 rounded-full border-4 border-emerald-400/20 animate-ping" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">{activeCall.targetDisplayName || 'Teman'}</h2>
                  <p className="text-neutral-400 text-sm">{activeCall.status === 'calling' ? 'Memanggil...' : 'Panggilan suara aktif'}</p>
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-lg font-bold tracking-wider tabular-nums text-white">
                  {activeCall.status === 'calling' ? 'Memanggil...' : fmtDuration(callElapsed)}
                </span>
              </div>
            </div>

            <div className="px-6 pb-8 pt-2">
              <div className="flex items-center justify-center gap-3 sm:gap-6">
                <button
                  onClick={() => {
                    const next = !callMicOn
                    setCallMicOn(next)
                    if (localStreamRef.current) {
                      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next })
                    }
                    try { signaling.emit('call:toggleMic', { roomId: activeCall.roomId, muted: !next }) } catch {}
                  }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition border ${
                    callMicOn
                      ? 'bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800'
                      : 'bg-cyan-500 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/30'
                  }`}
                  title={callMicOn ? 'Matikan mic' : 'Nyalakan mic'}
                >
                  {callMicOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>
                {activeCall.type === 'video' && (
                  <button
                    onClick={() => {
                      const next = !callCamOn
                      setCallCamOn(next)
                      if (localStreamRef.current) {
                        localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = next })
                      }
                      try { signaling.emit('call:toggleCam', { roomId: activeCall.roomId, off: !next }) } catch {}
                    }}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition border ${
                      callCamOn
                        ? 'bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800'
                        : 'bg-cyan-500 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/30'
                    }`}
                    title={callCamOn ? 'Matikan kamera' : 'Nyalakan kamera'}
                  >
                    {callCamOn ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6 line-through" />}
                  </button>
                )}
                <button
                  onClick={endCall}
                  className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center transition shadow-2xl shadow-cyan-500/40 scale-105 hover:scale-110"
                  title="Akhiri panggilan"
                >
                  <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 rotate-[135deg]" />
                </button>
                <button
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800 flex items-center justify-center transition border"
                  title="Info pengguna"
                  onClick={() => {
                    if (selectedConversation) navigate(`/profile/${selectedConversation}`)
                  }}
                >
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Chat
