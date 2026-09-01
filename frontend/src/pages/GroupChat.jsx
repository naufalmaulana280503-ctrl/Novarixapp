import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { API_ORIGIN } from '../services/backendUrl'
import { useAuth } from '../context/AuthContext'
import CreateGroupModal from '../components/CreateGroupModal'
import MessageActions from '../components/MessageActions'
import { useToast } from '../context/ToastContext'
import signaling from '../services/signalingClient'

import {
  MessageCircle, Phone, Video, Plus, Search,
  Users, FileText, Shield, ArrowLeft, X,
  Send, Paperclip, Mic, MicOff, VideoOff, PhoneOff,
  PhoneIncoming, PhoneMissed, PhoneOutgoing,
  UserCog, LogOut, Trash2, ChevronRight, Star, Pencil,
  Image, Smile, Pin, MapPin, Play, Pause, Download,
  StopCircle, BarChart3, Check, Clock,
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

const Avatar = ({ name, color, size = 40, online = false, ring = false, showBadge = false }) => {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${color || 'from-sky-400 via-cyan-500 to-emerald-400'} text-white font-bold shadow ${ring ? 'ring-2 ring-white/20' : ''}`}
        style={{ width: size, height: size, fontSize: Math.max(12, size / 2.5) }}
      >
        {initial}
      </div>
      {(online || showBadge) && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#101014]" />
      )}
    </div>
  )
}

const fmtTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const diffDays = Math.floor((today - d) / (24 * 3600 * 1000))
  if (diffDays < 7) return d.toLocaleDateString('id-ID', { weekday: 'short' })
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

const fmtDateLabel = (ts) => {
  const date = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hari ini'
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const fmtCallDuration = (sec) => {
  if (!sec) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const resolveMedia = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

const downloadMedia = async (url, filename) => {
  if (!url) return false
  try {
    const response = await fetch(resolveMedia(url))
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename || 'novarix-media'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
    return true
  } catch (error) {
    console.warn('Media download failed', error)
    return false
  }
}

const PollBubble = ({ pollId, mine }) => {
  const [poll, setPoll] = useState(null)
  const [myVote, setMyVote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [votingIdx, setVotingIdx] = useState(null)
  const { currentUser } = useAuth()

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/chat/poll/${pollId}`)
      setPoll(res.data)
    } finally {
      setLoading(false)
    }
  }, [pollId])

  useEffect(() => { load() }, [load])

  const vote = async (idx) => {
    if (votingIdx != null) return
    setVotingIdx(idx)
    try {
      await api.post(`/chat/poll/${pollId}/vote`, { optionIndex: idx })
      setMyVote(idx)
      await load()
    } finally {
      setVotingIdx(null)
    }
  }

  if (loading || !poll) {
    return (
      <div className="min-w-[260px] flex items-center gap-2 py-2">
        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        <span className="text-xs opacity-80">Memuat polling...</span>
      </div>
    )
  }

  const total = poll.totalVotes || 0
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date()

  return (
    <div className="min-w-[280px]">
      <div className="flex items-start gap-2 mb-3">
        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${mine ? 'bg-white/20' : 'bg-cyan-500/20 border border-cyan-500/30'}`}>
          <BarChart3 className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] opacity-80 mb-0.5 uppercase tracking-wider font-bold">Polling</p>
          <p className="text-sm font-bold leading-snug">{poll.question}</p>
          {isExpired && (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] opacity-70">
              <Clock className="w-3 h-3" /> Sudah ditutup
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {poll.options.map((opt, idx) => {
          const voted = myVote === idx
          const pct = total > 0 ? opt.percentage : 0
          return (
            <button
              key={idx}
              type="button"
              disabled={isExpired || votingIdx != null}
              onClick={() => vote(idx)}
              className={`w-full text-left relative rounded-xl overflow-hidden border transition ${
                voted
                  ? mine ? 'border-white/40' : 'border-cyan-500/60'
                  : mine ? 'border-white/10 hover:border-white/30' : 'border-white/5 hover:border-white/20'
              } disabled:opacity-80`}
            >
              <div
                className={`absolute inset-0 ${mine ? 'bg-white/10' : 'bg-cyan-500/10'}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative px-3 py-2.5 flex items-center gap-2.5">
                <span className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ${
                  voted ? (mine ? 'bg-white border-white text-[#101014]' : 'bg-cyan-500 border-cyan-500 text-white') : 'border-white/30'
                }`}>
                  {voted && <Check className="w-3 h-3" />}
                </span>
                <span className="flex-1 text-sm font-medium min-w-0 truncate">{opt.text}</span>
                <span className="text-[11px] opacity-80 font-mono shrink-0">
                  {total > 0 ? `${pct}%` : '—'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] opacity-80">
        <span>{total} suara</span>
        {poll.expiresAt && !isExpired && (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Berakhir {fmtTime(poll.expiresAt)}
          </span>
        )}
      </div>
    </div>
  )
}

const MessageBubbleContent = ({ m, onPlayVoice }) => {
  if (m.pollId) {
    const mine = false
    return <PollBubble pollId={m.pollId} mine={mine} />
  }
  if (m.documentUrl) {
    return (
      <div className="flex items-center gap-3 min-w-[240px]">
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{m.documentName || 'Dokumen'}</p>
          <p className="text-[11px] opacity-80">{formatBytes(m.documentSize)}</p>
        </div>
        <button
          type="button"
          onClick={() => downloadMedia(m.documentUrl, m.documentName || 'dokumen')}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
          title="Unduh dokumen"
        >
          <Download className="w-4 h-4 opacity-80" />
        </button>
      </div>
    )
  }
  if (m.imageUrl) {
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
  if (m.videoUrl) return <video src={resolveMedia(m.videoUrl)} controls className="rounded-xl max-w-[300px] max-h-[320px]" />
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
        <button
          type="button"
          onClick={() => downloadMedia(m.voiceUrl, `voice-note-${m.id || 'novarix'}.webm`)}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
          title="Unduh voice note"
        >
          <Download className="w-4 h-4 opacity-80" />
        </button>
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

const CallIcon = ({ type, direction, missed }) => {
  if (type === 'video') {
    return <Video className="w-4 h-4 text-sky-400" />
  }
  if (missed) {
    return <PhoneMissed className="w-4 h-4 text-cyan-400" />
  }
  return direction === 'incoming'
    ? <PhoneIncoming className="w-4 h-4 text-emerald-400" />
    : <PhoneOutgoing className="w-4 h-4 text-sky-400" />
}

const GroupChat = () => {
  const { addToast } = useToast()
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [group, setGroup] = useState(null)
  const [groupsList, setGroupsList] = useState([])
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showGroupInfo, setShowGroupInfo] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [leftTab, setLeftTab] = useState('chats')
  const [query, setQuery] = useState('')
  const [showStickers, setShowStickers] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [typingText, setTypingText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingMessage, setEditingMessage] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)
  const messagesEndRef = useRef(null)

  const [showPollModal, setShowPollModal] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])

  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const mediaRecorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const recordedChunksRef = useRef([])

  const docInputRef = useRef(null)
  const imgInputRef = useRef(null)

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    fetchMyGroups()
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

  useEffect(() => {
    const h = ({ groupId, fromUserId, fromDisplayName, senderInfo, message, payload, timestamp }) => {
      if (id && String(groupId) !== String(id)) return
      const fuid = String(fromUserId)
      if (String(fromUserId) === String(currentUser?.id)) return
      setMessages(prev => {
        if (prev.some(m => String(m.senderId) === fuid && m.text === message && Math.abs(new Date(m.createdAt || 0) - new Date(timestamp)) < 2000)) return prev
        return [...prev, {
          id: 'rt_' + timestamp + '_' + Math.random().toString(36).slice(2, 7),
          senderId: fromUserId,
          senderDisplayName: fromDisplayName || senderInfo?.displayName || 'User',
          text: message,
          ...(payload || {}),
          createdAt: new Date(timestamp).toISOString(),
          isRealtime: true,
        }]
      })
    }
    signaling.on('group:newMessage', h)
    return () => signaling.off('group:newMessage', h)
  }, [id, currentUser])

  useEffect(() => {
    if (id) {
      fetchGroupDetail(id)
      fetchGroupMessages(id)
      fetchGroupMembers(id)
      if (currentUser?.id) signaling.emit('group:join', { groupId: id })
    }
    return () => {
      if (id) signaling.emit('group:leave', { groupId: id })
    }
  }, [id, currentUser?.id])

  const fetchMyGroups = async () => {
    try {
      const res = await api.get('/groups')
      setGroupsList(res.data.groups || [])
    } catch (err) {
      console.error('Failed to fetch groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupDetail = async (gid) => {
    try {
      const res = await api.get(`/groups/${gid}`)
      setGroup(res.data)
    } catch (err) {
      console.error('Failed to fetch group detail:', err)
    }
  }

  const fetchGroupMessages = async (gid) => {
    try {
      const res = await api.get(`/groups/${gid}/messages`)
      const msgs = (res.data.messages || []).slice().reverse()
      setMessages(msgs)
    } catch (err) {
      console.error('Failed to fetch group messages:', err)
    }
  }

  const fetchGroupMembers = async (gid) => {
    try {
      const res = await api.get(`/groups/${gid}/members`)
      setMembers(res.data.members || [])
    } catch (err) {
      console.error('Failed to fetch group members:', err)
    }
  }

  const openEditGroup = () => {
    setEditGroupName(group?.name || '')
    setEditGroupDescription(group?.description || '')
    setShowEditGroup(true)
  }

  const saveGroupDetails = async (event) => {
    event.preventDefault()
    if (!id || !editGroupName.trim()) return
    setSavingGroup(true)
    try {
      const res = await api.put(`/groups/${id}`, {
        name: editGroupName.trim(),
        description: editGroupDescription.trim() || null,
      })
      setGroup(prev => ({ ...prev, ...res.data }))
      setGroupsList(prev => prev.map(item => String(item.id) === String(id)
        ? { ...item, name: editGroupName.trim(), description: editGroupDescription.trim() || null }
        : item))
      setShowEditGroup(false)
      addToast({ type: 'success', text: 'Info grup berhasil diperbarui' })
    } catch (err) {
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal memperbarui info grup' })
    } finally {
      setSavingGroup(false)
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

  const sendGroupPayload = async (payload) => {
    if (!id) return
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
      const res = await api.post(`/groups/${id}/messages`, { ...payload, replyToId: replyingTo?.id || payload.replyToId || null })
      setMessages(prev => prev.map(m => m.id === temporaryId
        ? { ...m, ...(res.data || {}), id: res.data?.id || m.id, isPending: false, sent: true }
        : m))
      setReplyingTo(null)
      try {
        var pt = ''
        if (payload.text) pt = payload.text
        else if (payload.pollId) pt = '[Polling] ' + (pollQuestion || 'Baru')
        else if (payload.documentUrl) pt = '[Dokumen] ' + (payload.documentName || 'File')
        else if (payload.imageUrl) pt = '[Gambar]'
        else if (payload.voiceUrl) pt = '[Voice Note] ' + formatDuration(payload.voiceDuration)
        else if (payload.locationName) pt = '[Lokasi] ' + payload.locationName
        if (pt) {
          signaling.emit('group:sendMessage', {
            groupId: id,
            message: pt,
            payload,
          })
        }
      } catch (err) {}
    } catch (err) {
      console.error('Failed to send group message:', err)
      setMessages(prev => prev.map(m => m.id === temporaryId ? { ...m, isPending: false, isError: true } : m))
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal kirim pesan' })
    } finally {
      setSending(false)
    }
  }

  const editMessage = async (message) => {
    const text = message.text !== undefined ? message.text : window.prompt('Edit pesan', '')
    if (!text?.trim()) return
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

  const deleteMessageForMe = (message) => {
    setMessages(prev => prev.filter(item => item.id !== message.id))
  }

  const reportMessage = async (message, category, details) => {
    try { await api.post('/reports', { category, details, targetGroupId: id, targetMessageId: message.id }); addToast({ type: 'success', text: 'Laporan terkirim' }) }
    catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal mengirim laporan' }) }
  }

  const addGroupMember = async () => {
    const userId = window.prompt('Masukkan ID pengguna yang ingin ditambahkan')
    if (!userId) return
    try {
      await api.post(`/groups/${id}/members`, { userId: Number(userId) })
      await fetchGroupMembers(id)
      addToast({ type: 'success', text: 'Anggota berhasil ditambahkan' })
    } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal menambahkan anggota' }) }
  }

  const reportGroup = async () => {
    const details = window.prompt('Jelaskan masalah group (minimal 10 karakter)')
    if (!details || details.trim().length < 10) return
    try { await api.post('/reports', { category: 'Group', details, targetGroupId: id }); addToast({ type: 'success', text: 'Laporan group terkirim' }) }
    catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal melaporkan group' }) }
  }

  const downloadAllMedia = async () => {
    const media = messages.flatMap((message) => {
      if (message.deletedAt) return []
      const items = []
      if (message.documentUrl) items.push([message.documentUrl, message.documentName || `dokumen-${message.id}`])
      if (message.voiceUrl) items.push([message.voiceUrl, `voice-note-${message.id}.webm`])
      if (message.imageUrl) items.push([message.imageUrl, `gambar-${message.id}`])
      if (message.videoUrl) items.push([message.videoUrl, `video-${message.id}`])
      return items
    })
    if (!media.length) {
      addToast({ type: 'info', text: 'Belum ada media yang bisa diunduh' })
      return
    }
    let downloaded = 0
    for (const [url, filename] of media) {
      if (await downloadMedia(url, filename)) downloaded += 1
    }
    addToast({
      type: downloaded ? 'success' : 'error',
      text: downloaded ? `${downloaded} dari ${media.length} media berhasil diunduh` : 'Media tidak dapat diunduh',
    })
  }

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!newMessage.trim() || !id) return
    if (editingMessage) {
      await editMessage({ ...editingMessage, text: newMessage.trim() })
      setEditingMessage(null)
      setNewMessage('')
      return
    }
    await sendGroupPayload({ text: newMessage.trim() })
  }

  const handleSendSticker = async (stk) => {
    if (!id) return
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
      await api.post(`/groups/${id}/messages`, { text: stk })
      setMessages(prev => prev.map(m => m.id === temporaryId ? { ...m, isPending: false } : m))
      try {
        signaling.emit('group:sendMessage', { groupId: id, message: stk })
      } catch {}
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
        await sendGroupPayload({ imageUrl: up.url, text: newMessage.trim() || null })
      } else if (up.type === 'voice') {
        await sendGroupPayload({ voiceUrl: up.url, voiceDuration: up.duration || 0 })
      } else {
        await sendGroupPayload({
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
          await sendGroupPayload({ voiceUrl: up.url, voiceDuration: dur })
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
      await sendGroupPayload({ locationName: label, latitude, longitude })
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: 'Gagal mendapatkan lokasi: ' + (err?.message || 'Izin ditolak') })
    } finally {
      setUploading(false)
      setShowAttachMenu(false)
    }
  }

  const createPoll = async () => {
    const q = pollQuestion.trim()
    const opts = pollOptions.map(o => o.trim()).filter(Boolean)
    if (!q) {
      addToast({ type: 'error', text: 'Pertanyaan polling belum diisi' })
      return
    }
    if (opts.length < 2) {
      addToast({ type: 'error', text: 'Minimal 2 pilihan polling' })
      return
    }
    try {
      setUploading(true)
      const pollRes = await api.post(`/chat/group/${id}/poll`, {
        question: q,
        options: opts,
      })
      const pollId = pollRes.data?.id
      if (!pollId) {
        addToast({ type: 'error', text: 'Gagal membuat polling' })
        return
      }
      await sendGroupPayload({ pollId, text: null })
      setPollQuestion('')
      setPollOptions(['', ''])
      setShowPollModal(false)
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal membuat polling' })
    } finally {
      setUploading(false)
    }
  }

  const addPollOption = () => {
    if (pollOptions.length >= 10) return
    setPollOptions([...pollOptions, ''])
  }

  const removePollOption = (idx) => {
    if (pollOptions.length <= 2) return
    setPollOptions(pollOptions.filter((_, i) => i !== idx))
  }

  const amIAdmin = () => {
    if (!members.length || !currentUser?.id) return true
    const me = members.find(m => String(m.userId) === String(currentUser.id))
    return me && (me.role === 'owner' || me.role === 'admin')
  }

  const leaveGroup = async () => {
    if (!id) return
    try {
      await api.post(`/groups/${id}/leave`)
      addToast({ type: 'success', text: 'Kamu keluar dari grup' })
      navigate('/groups')
    } catch (err) {
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal keluar grup' })
    }
  }

  const kickMember = async (uid) => {
    if (!id) return
    try {
      await api.post(`/groups/${id}/kick`, { userId: uid })
      addToast({ type: 'success', text: 'Anggota dikeluarkan' })
      fetchGroupMembers(id)
    } catch (err) {
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal keluarkan anggota' })
    }
  }

  const filteredGroups = groupsList.filter(g => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (g.name || '').toLowerCase().includes(q)
      || (g.description || '').toLowerCase().includes(q)
      || (g.lastMessage || '').toLowerCase().includes(q)
  })

  const startCall = useCallback(async (type) => {
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
      const callRoomId = 'call_group_' + (id || 'x') + '_' + Date.now()
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return
        try { signaling.emit('call:ice', { roomId: callRoomId, candidate: ev.candidate }) } catch {}
      }
      pendingCandidatesRef.current = []

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      setCallCamOn(type === 'video')
      setCallMicOn(true)
      setCallElapsed(0)
      const initial = {
        type,
        roomId: callRoomId,
        callId: null,
        groupId: id,
        groupName: group?.name || 'Group Call',
        status: 'calling',
        startedAt: null,
        role: 'initiator',
      }
      setActiveCall(initial)
      try {
        const callRecord = await api.post('/calls/initiate', { type, groupId: id })
        setActiveCall(prev => prev ? { ...prev, callId: callRecord.data?.id } : prev)
      } catch (err) {
        addToast({ type: 'error', text: err?.response?.data?.message || 'Panggilan grup gagal dicatat' })
      }

      try {
        signaling.emit('call:start', {
          callId: callRoomId,
          type,
          roomId: callRoomId,
          groupId: id,
          offer,
          initiatorInfo: {
            userId: currentUser?.id,
            displayName: currentUser?.displayName,
          },
        })
      } catch (e) { console.warn('group call:start error', e) }

      setTimeout(() => {
        setActiveCall(prev => prev?.status === 'calling' ? { ...prev, status: 'connected', startedAt: Date.now() } : prev)
        const startTs = Date.now()
        if (callTimerRef.current) clearInterval(callTimerRef.current)
        callTimerRef.current = setInterval(() => {
          setCallElapsed(Math.floor((Date.now() - startTs) / 1000))
        }, 1000)
      }, 2500)

    } catch (err) {
      console.error('group startCall error:', err)
      addToast({ type: 'error', text: 'Gagal memulai panggilan grup: ' + (err?.message || 'Izin kamera/mic ditolak') })
      endCallInternal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall, currentUser, id, group])

  useEffect(() => {
    if (!activeCall?.roomId || activeCall.role !== 'initiator') return
    const { roomId } = activeCall
    const onAnswered = async ({ roomId: answeredRoomId, answer }) => {
      if (answeredRoomId !== roomId || !answer || !pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        for (const candidate of pendingCandidatesRef.current.splice(0)) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        }
        setActiveCall(prev => prev?.roomId === roomId
          ? { ...prev, status: 'connected', startedAt: prev.startedAt || Date.now() }
          : prev)
      } catch (err) {
        console.warn('group call answer error', err)
      }
    }
    const onIce = ({ roomId: iceRoomId, candidate }) => {
      if (iceRoomId !== roomId || !candidate || !pcRef.current) return
      if (pcRef.current.remoteDescription) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      } else {
        pendingCandidatesRef.current.push(candidate)
      }
    }
    signaling.on('call:answered', onAnswered)
    signaling.on('call:ice', onIce)
    return () => {
      signaling.off('call:answered', onAnswered)
      signaling.off('call:ice', onIce)
    }
  }, [activeCall])

  useEffect(() => {
    const onIncoming = async ({ type, roomId, groupId, offer, fromUserId, fromSocket, initiatorInfo }) => {
      if (!id || String(groupId) !== String(id) || String(fromUserId) === String(currentUser?.id) || !offer || activeCall) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
        localStreamRef.current = stream
        if (selfVideoRef.current && type === 'video') selfVideoRef.current.srcObject = stream
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        })
        pcRef.current = pc
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
        pc.ontrack = (event) => {
          if (peerVideoRef.current && event.streams?.[0]) peerVideoRef.current.srcObject = event.streams[0]
        }
        pc.onicecandidate = (event) => {
          if (event.candidate) signaling.emit('call:ice', { roomId, candidate: event.candidate, toSocket: fromSocket })
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        signaling.emit('call:answer', { roomId, answer, toSocket: fromSocket })
        setCallCamOn(type === 'video')
        setCallMicOn(true)
        setCallElapsed(0)
        setActiveCall({
          type, roomId, groupId, groupName: group?.name || 'Group Call',
          status: 'connected', startedAt: Date.now(), role: 'receiver',
          targetUserId: fromUserId, targetDisplayName: initiatorInfo?.displayName || 'Anggota grup',
        })
        const startedAt = Date.now()
        callTimerRef.current = setInterval(() => setCallElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
        addToast({ type: 'success', text: `Panggilan ${type === 'video' ? 'video' : 'suara'} grup diterima` })
      } catch (err) {
        console.warn('group incoming call error', err)
        addToast({ type: 'error', text: 'Gagal menerima panggilan grup' })
      }
    }
    signaling.on('call:incoming', onIncoming)
    return () => signaling.off('call:incoming', onIncoming)
  }, [activeCall, addToast, currentUser, group, id])

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
    if (!remoteInitiated && activeCall?.callId) {
      api.post(`/calls/${activeCall.callId}/end`, {
        endedAt: new Date().toISOString(),
        durationSeconds: callElapsed,
      }).catch(() => {})
    }
    setActiveCall(null)
    setCallElapsed(0)
  }
  const endCall = () => endCallInternal(false)

  useEffect(() => {
    const h = ({ roomId }) => {
      if (!activeCall) return
      if (roomId === activeCall.roomId) endCallInternal(true)
    }
    signaling.on('call:ended', h)
    return () => signaling.off('call:ended', h)
  }, [activeCall])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0e] text-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-neutral-800 border-t-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-[#0b0b0e] text-white flex overflow-hidden">

      <aside className="w-full sm:w-[340px] shrink-0 h-full border-r border-neutral-800/70 bg-[#101014] flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-800/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 nova-gradient-text" />
              <h1 className="font-bold tracking-tight text-lg nova-gradient-text nova-animate-gradient">Grup Chat</h1>
            </div>
            <button
              onClick={() => setShowCreateGroup(true)}
              title="Buat grup baru"
              className="w-9 h-9 rounded-xl nova-gradient-bg nova-animate-gradient flex items-center justify-center hover:brightness-110 transition shadow"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex gap-1 p-1 bg-[#1a1a20] rounded-xl mb-3 border border-neutral-800">
            <button
              onClick={() => setLeftTab('chats')}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition ${
                leftTab === 'chats' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Grup
            </button>
            <button
              onClick={() => setLeftTab('calls')}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition ${
                leftTab === 'calls' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" /> Riwayat
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={leftTab === 'chats' ? 'Cari grup...' : 'Cari riwayat panggilan...'}
              className="w-full bg-[#1a1a20] border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {leftTab === 'chats' ? (
            filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-60" />
                <p>Belum ada grup</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl nova-gradient-bg nova-animate-gradient text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Buat Grup
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredGroups.map((g) => {
                  const active = String(id) === String(g.id)
                  return (
                    <li key={g.id}>
                      <button
                        onClick={() => navigate(`/groups/${g.id}`)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition ${
                          active ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <Avatar
                          name={g.name}
                          color={g.avatarColor || 'from-sky-500 via-cyan-500 to-emerald-400'}
                          size={46}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h3 className="font-semibold text-sm truncate pr-2">{g.name}</h3>
                            <span className="text-[10px] text-neutral-500 shrink-0">{fmtTime(g.lastMessageAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-neutral-400 truncate">
                              <Users className="w-3 h-3 inline mr-1 -mt-0.5 opacity-70" />
                              {g.memberCount || 0} anggota · {g.lastMessage || 'Belum ada pesan'}
                            </p>
                            {g.unreadCount > 0 && (
                              <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full nova-gradient-bg nova-animate-gradient text-[10px] font-bold text-white">
                                {g.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          ) : (
            <div className="space-y-1">
              {members.length === 0 && filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-sm">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-60" />
                  <p>Belum ada riwayat panggilan grup</p>
                </div>
              ) : (
                <div className="px-2 py-4 text-center text-xs text-neutral-500">
                  Riwayat panggilan grup akan ditampilkan di sini. Gunakan tombol 📞 di header grup untuk memulai panggilan.
                </div>
              )}
            </div>
          )}
        </div>

        {showCreateGroup && (
          <CreateGroupModal
            open={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            onCreated={(g) => {
              setShowCreateGroup(false)
              fetchMyGroups()
              if (g?.id) navigate(`/groups/${g.id}`)
            }}
          />
        )}
      </aside>

      <section className="flex-1 h-full flex flex-col min-w-0 bg-[#0b0b0e]">
        {!id ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500/20 via-cyan-500/20 to-emerald-500/20 border border-neutral-800 flex items-center justify-center mb-5">
              <Users className="w-10 h-10 nova-gradient-text" />
            </div>
            <h2 className="text-xl font-bold mb-2">Pilih grup atau buat grup baru</h2>
            <p className="text-neutral-400 max-w-sm text-sm mb-6">
              Novarix Group Chat mendukung pesan teks, stiker, dokumen, gambar, voice note, berbagi lokasi, polling interaktif, dan panggilan suara / video grup layaknya WhatsApp.
            </p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl nova-gradient-bg nova-animate-gradient font-semibold hover:brightness-110 transition text-sm text-white"
            >
              <Plus className="w-4 h-4" /> Buat Grup Baru
            </button>
          </div>
        ) : (
          <>
            <header className="h-[72px] shrink-0 px-4 sm:px-6 flex items-center gap-4 border-b border-neutral-800/70 bg-[#101014]">
              <button
                onClick={() => navigate('/groups')}
                className="sm:hidden w-9 h-9 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <Avatar
                name={group?.name || 'Grup'}
                color={group?.avatarColor || 'from-sky-400 via-cyan-500 to-emerald-400'}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-base truncate">{group?.name || 'Memuat grup...'}</h2>
                  {group?.verified && <Shield className="w-4 h-4 text-sky-400" />}
                </div>
                <div className="text-xs text-neutral-400">
                  <Users className="w-3 h-3 inline mr-1 -mt-0.5 opacity-70" />
                  {members.length} anggota
                  {typingText && <span className="text-emerald-400 ml-2">· {typingText}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => startCall('voice')}
                  className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition flex items-center justify-center"
                  title="Voice Call Grup"
                >
                  <Phone className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 transition flex items-center justify-center"
                  title="Video Call Grup"
                >
                  <Video className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setShowGroupInfo(v => !v)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    showGroupInfo
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 border border-transparent'
                  }`}
                  title="Info grup"
                >
                  <UserCog className="w-4.5 h-4.5" />
                </button>
                {String(group?.ownerId) === String(currentUser?.id) && (
                  <button
                    onClick={openEditGroup}
                    className="w-10 h-10 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 border border-transparent transition flex items-center justify-center"
                    title="Edit info grup"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 flex min-h-0">
              <div className="flex-1 flex flex-col min-w-0">
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
                      <Users className="w-3 h-3 nova-gradient-text" />
                      <span className="nova-gradient-text">Novarix Group Chat</span> · {group?.name || 'Grup'}
                    </p>
                  </div>

                  <ul className="max-w-3xl mx-auto space-y-3">
                    {messages.length === 0 ? (
                      <li className="text-center py-10">
                        <div className="w-16 h-16 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
                          <MessageCircle className="w-7 h-7 text-neutral-600" />
                        </div>
                        <p className="text-neutral-500 text-sm">Belum ada pesan. Kirim pesan pertama!</p>
                      </li>
                    ) : null}
                    {messages.map((m, idx) => {
                      const prev = messages[idx - 1]
                      const mine = String(m.senderId) === String(currentUser?.id)
                      const showAvatar = !mine && (!prev || String(prev.senderId) !== String(m.senderId))
                      const memberInfo = members.find(mm => String(mm.userId) === String(m.senderId))
                      const senderName = mine
                        ? (currentUser?.displayName || 'Kamu')
                        : (m.senderDisplayName || memberInfo?.displayName || memberInfo?.username || 'Anggota')
                      const senderColor = memberInfo?.avatarColor || null
                      return (
                        <li key={m.id || idx} className={`flex gap-2.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && (
                            <div className="w-8 shrink-0">
                              {showAvatar ? (
                                <Avatar
                                  name={senderName}
                                  color={senderColor || 'from-sky-400 via-cyan-500 to-emerald-400'}
                                  size={32}
                                  online={onlineUsers.has(String(m.senderId))}
                                />
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
                        <div className="absolute bottom-12 left-0 z-20 w-56 rounded-2xl border border-neutral-800 bg-[#1a1a20] shadow-2xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => { imgInputRef.current?.click(); setShowAttachMenu(false) }}
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
                            onClick={() => { docInputRef.current?.click(); setShowAttachMenu(false) }}
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
                          <button
                            type="button"
                            onClick={() => {
                              if (!amIAdmin()) {
                                addToast({ type: 'error', text: 'Hanya admin/owner yang bisa membuat polling' })
                                return
                              }
                              setShowPollModal(true); setShowAttachMenu(false)
                            }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 border-t border-neutral-800"
                          >
                            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                              <BarChart3 className="w-4 h-4" />
                            </span>
                            <div>
                              <p className="font-semibold text-xs">Polling</p>
                              <p className="text-[10px] text-neutral-500">Buat polling grup</p>
                            </div>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (!amIAdmin()) {
                            addToast({ type: 'error', text: 'Hanya admin/owner yang bisa membuat polling' })
                            return
                          }
                          setShowPollModal(true)
                        }}
                        className="w-10 h-10 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-amber-300 transition"
                        title="Buat Polling"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                    </div>

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
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder="Ketik pesan grup... (Enter kirim, Shift+Enter baris baru; tahan 🎤 untuk voice note)"
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
              </div>

              {showGroupInfo && (
                <aside className="w-full lg:w-[320px] shrink-0 h-full border-l border-neutral-800/70 bg-[#101014] flex flex-col overflow-y-auto hidden lg:flex">
                  <div className="px-5 pt-6 pb-5 text-center border-b border-neutral-800/70">
                    <Avatar
                      name={group?.name || 'Grup'}
                      color={group?.avatarColor || 'from-sky-400 via-cyan-500 to-emerald-400'}
                      size={84}
                      ring
                    />
                    <h3 className="mt-4 font-bold text-lg">{group?.name || 'Grup'}</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      <Users className="w-3 h-3 inline mr-1 -mt-0.5" />
                      {members.length} anggota
                    </p>
                    {group?.description && (
                      <p className="text-xs text-neutral-400 mt-3 leading-relaxed">{group.description}</p>
                    )}
                  </div>

                  {group?.rules && group.rules.length > 0 && (
                    <div className="px-5 py-5 border-b border-neutral-800/70">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Peraturan Grup</h4>
                      </div>
                      <ol className="space-y-2">
                        {(Array.isArray(group.rules) ? group.rules : String(group.rules).split('\n').filter(Boolean)).map((rule, i) => (
                          <li key={i} className="flex gap-2.5 text-xs text-neutral-300">
                            <span className="text-[10px] font-bold w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="px-5 py-5 border-b border-neutral-800/70">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-sky-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Anggota ({members.length})</h4>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {members.map((mem) => {
                        const isMe = String(mem.userId) === String(currentUser?.id)
                        const roleBadge = mem.role === 'owner'
                          ? <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">OWNER</span>
                          : mem.role === 'admin'
                            ? <span className="text-[9px] px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">ADMIN</span>
                            : null
                        const iAmAdmin = amIAdmin()
                        return (
                          <li key={mem.userId} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition group">
                            <Avatar
                              name={mem.displayName || mem.username || '?'}
                              color={mem.avatarColor}
                              size={36}
                              online={onlineUsers.has(String(mem.userId))}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">
                                  {isMe ? `${mem.displayName || mem.username || 'Kamu'} (Anda)` : (mem.displayName || mem.username)}
                                </p>
                                {roleBadge}
                              </div>
                              <p className="text-[11px] text-neutral-500 truncate">
                                {onlineUsers.has(String(mem.userId)) ? (
                                  <span className="text-emerald-400">● Online</span>
                                ) : (mem.lastSeen || 'Offline')}
                              </p>
                            </div>
                            {iAmAdmin && !isMe && mem.role !== 'owner' && (
                              <button
                                onClick={() => kickMember(mem.userId)}
                                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/30 flex items-center justify-center transition"
                                title="Keluarkan anggota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  <div className="px-5 py-5 mt-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Aksi</h4>
                    </div>
                    <button
                      onClick={downloadAllMedia}
                      disabled={!messages.some(message => message.documentUrl || message.voiceUrl || message.imageUrl || message.videoUrl)}
                      className="w-full mb-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-sm font-semibold hover:bg-sky-500/20 transition disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" /> Unduh Semua
                    </button>
                    <button
                      onClick={addGroupMember}
                      disabled={!amIAdmin()}
                      className="w-full mb-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-sm font-semibold hover:bg-sky-500/20 transition disabled:opacity-50"
                    >
                      <Users className="w-4 h-4" /> Tambah Anggota
                    </button>
                    <button
                      onClick={reportGroup}
                      className="w-full mb-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 transition"
                    >
                      <Shield className="w-4 h-4" /> Laporkan Grup
                    </button>
                    <button
                      onClick={leaveGroup}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/20 transition"
                    >
                      <LogOut className="w-4 h-4" /> Keluar dari Grup
                    </button>
                  </div>
                </aside>
              )}

              {showEditGroup && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                  <form onSubmit={saveGroupDetails} className="w-full max-w-md rounded-2xl border border-neutral-700 bg-[#17171d] p-5 shadow-2xl">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-lg">Edit info grup</h3>
                      <button type="button" onClick={() => setShowEditGroup(false)} className="text-neutral-400 hover:text-white" title="Tutup"><X className="w-5 h-5" /></button>
                    </div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">Nama grup</label>
                    <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} maxLength={80} required className="w-full mb-4 rounded-xl border border-neutral-700 bg-[#101014] px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
                    <label className="block text-xs font-semibold text-neutral-400 mb-1">Deskripsi grup</label>
                    <textarea value={editGroupDescription} onChange={e => setEditGroupDescription(e.target.value)} maxLength={1000} rows={5} className="w-full resize-none rounded-xl border border-neutral-700 bg-[#101014] px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
                    <div className="flex justify-end gap-2 mt-5">
                      <button type="button" onClick={() => setShowEditGroup(false)} className="px-4 py-2 rounded-xl bg-neutral-800 text-sm">Batal</button>
                      <button type="submit" disabled={savingGroup} className="px-4 py-2 rounded-xl nova-gradient-bg text-sm font-semibold disabled:opacity-60">{savingGroup ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {showPollModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-[#101014] shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-800/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Buat Polling Grup</h3>
                  <p className="text-[11px] text-neutral-400">{group?.name || 'Grup'}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowPollModal(false); setPollQuestion(''); setPollOptions(['', '']) }}
                className="w-9 h-9 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 block mb-2">Pertanyaan Polling</label>
                <textarea
                  rows={2}
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Contoh: Kapan kita mau meeting minggu ini?"
                  className="w-full bg-[#1a1a20] border border-neutral-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 block mb-2">Pilihan Jawaban</label>
                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[11px] font-bold text-neutral-300">
                        {idx + 1}
                      </span>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions]
                          next[idx] = e.target.value
                          setPollOptions(next)
                        }}
                        placeholder={`Pilihan ${idx + 1}`}
                        className="flex-1 bg-[#1a1a20] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(idx)}
                          className="w-9 h-9 rounded-xl bg-neutral-800/60 hover:bg-cyan-500/20 hover:text-cyan-400 flex items-center justify-center transition"
                          title="Hapus pilihan"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-amber-500/40 hover:bg-amber-500/5 text-neutral-400 hover:text-amber-300 text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Pilihan
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800/70 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowPollModal(false); setPollQuestion(''); setPollOptions(['', '']) }}
                className="px-4 py-2.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={createPoll}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl nova-gradient-bg nova-animate-gradient text-sm font-semibold text-white hover:brightness-110 transition shadow disabled:opacity-60"
              >
                {uploading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
                Buat Polling
              </button>
            </div>
          </div>
        </div>
      )}

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
                Panggilan {activeCall.type === 'video' ? 'Video' : 'Suara'} Grup
                <div className="mt-0.5 text-neutral-500">
                  {activeCall.groupName} · {activeCall.status === 'calling' ? 'Menghubungkan...' : activeCall.status === 'connected' ? 'Terhubung' : 'Berakhir'}
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
                      <Avatar name={activeCall.groupName || 'Grup'} color="from-sky-400 via-cyan-500 to-emerald-400" size={96} />
                      <p className="mt-3 text-white/80 text-sm">Menghubungkan video grup...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center mb-2">
                  <div className="relative mb-6">
                    <Avatar name={activeCall.groupName || 'Grup'} color="from-sky-400 via-cyan-500 to-emerald-400" size={148} />
                    <span className="absolute inset-0 rounded-full border-4 border-emerald-400/20 animate-ping" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">{activeCall.groupName || 'Group Call'}</h2>
                  <p className="text-neutral-400 text-sm">{activeCall.status === 'calling' ? 'Memanggil anggota grup...' : 'Panggilan suara grup aktif'}</p>
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-lg font-bold tracking-wider tabular-nums text-white">
                  {activeCall.status === 'calling' ? 'Memanggil...' : fmtCallDuration(callElapsed)}
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
                      : 'bg-red-500 border-red-500/50 text-white shadow-lg shadow-red-500/30'
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
                    {callCamOn ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
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
                  onClick={() => setShowGroupInfo(true)}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800 flex items-center justify-center transition border"
                  title="Info grup & anggota"
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

export default GroupChat
