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
  StopCircle, BarChart3, Check, Clock, Menu, Camera,
  Volume2, Globe2, UserPlus, Hash,
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

const Avatar = ({ name, color, size = 40, online = false, ring = false }) => {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${color || 'from-teal-500 via-emerald-500 to-green-500'} text-white font-bold shadow-sm`}
        style={{ width: size, height: size, fontSize: Math.max(12, size / 2.5) }}
      >
        {initial}
      </div>
      {(online) && (
        <span className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full bg-emerald-500 ring-[3px] ring-[#111b21]" />
      )}
    </div>
  )
}

const fmtTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
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
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const resolveMedia = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

const downloadMedia = async (url, filename) => {
  if (!url) return false
  try {
    const res = await fetch(resolveMedia(url))
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const blob = await res.blob()
    const obj = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = obj
    link.download = filename || 'novarix-media'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(obj)
    return true
  } catch (err) {
    console.warn('download failed', err)
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
    } finally { setLoading(false) }
  }, [pollId])

  useEffect(() => { load() }, [load])

  const vote = async (idx) => {
    if (votingIdx != null) return
    setVotingIdx(idx)
    try {
      await api.post(`/chat/poll/${pollId}/vote`, { optionIndex: idx })
      setMyVote(idx)
      await load()
    } finally { setVotingIdx(null) }
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
        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${mine ? 'bg-white/15' : 'bg-emerald-500/20 border border-emerald-500/30'}`}>
          <BarChart3 className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] opacity-70 mb-0.5 uppercase tracking-wider font-bold">Polling</p>
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
                  ? mine ? 'border-white/40' : 'border-emerald-500/60'
                  : mine ? 'border-white/10 hover:border-white/30' : 'border-white/5 hover:border-white/20'
              } disabled:opacity-80`}
            >
              <div
                className={`absolute inset-0 ${mine ? 'bg-white/10' : 'bg-emerald-500/10'}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative px-3 py-2.5 flex items-center gap-2.5">
                <span className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ${
                  voted ? (mine ? 'bg-white border-white text-[#111b21]' : 'bg-emerald-500 border-emerald-500 text-white') : 'border-white/30'
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
  if (m.pollId) return <PollBubble pollId={m.pollId} mine={false} />
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
        <button onClick={() => downloadMedia(m.documentUrl, m.documentName || 'dokumen')}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0" title="Unduh">
          <Download className="w-4 h-4 opacity-80" />
        </button>
      </div>
    )
  }
  if (m.imageUrl) {
    return (
      <a href={resolveMedia(m.imageUrl)} target="_blank" rel="noopener noreferrer" className="block">
        <img src={resolveMedia(m.imageUrl)} alt="image" className="rounded-xl max-w-[280px] max-h-[320px] object-cover" loading="lazy" />
      </a>
    )
  }
  if (m.videoUrl) return <video src={resolveMedia(m.videoUrl)} controls className="rounded-xl max-w-[300px] max-h-[320px]" />
  if (m.voiceUrl) {
    const dur = m.voiceDuration || 0
    const [playing, setPlaying] = useState(false)
    const audioRef = useRef(null)
    const toggle = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio(resolveMedia(m.voiceUrl))
        audioRef.current.addEventListener('ended', () => setPlaying(false))
      }
      if (playing) { audioRef.current.pause(); setPlaying(false) }
      else {
        audioRef.current.currentTime = 0
        audioRef.current.play()
        setPlaying(true)
        onPlayVoice && onPlayVoice(m.id)
      }
    }
    return (
      <div className="flex items-center gap-3 min-w-[220px]">
        <button onClick={toggle} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition shrink-0">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-1.5">
            <div className="h-full w-1/3 bg-white rounded-full" />
          </div>
          <p className="text-[11px] opacity-80 font-mono">{formatDuration(dur)}</p>
        </div>
        <button onClick={() => downloadMedia(m.voiceUrl, `voice-note-${m.id || 'novarix'}.webm`)}
          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0" title="Unduh voice">
          <Download className="w-4 h-4 opacity-80" />
        </button>
      </div>
    )
  }
  if (m.locationName && m.latitude != null && m.longitude != null) {
    const u = `https://www.google.com/maps?q=${encodeURIComponent(`${m.latitude},${m.longitude}`)}`
    return (
      <a href={u} target="_blank" rel="noopener noreferrer" className="block hover:brightness-110 transition">
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
  if (m.sticker && !m.text) return <span className="text-5xl">{m.sticker}</span>
  return <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
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
  const [showGroupInfo, setShowGroupInfo] = useState(false) // WA-Style: OFF default
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
  const [groupInfoTab, setGroupInfoTab] = useState('info') // info | media | members
  const [mediaTab, setMediaTab] = useState('all') // all | images | videos | docs | links | locations
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [selectedInvitees, setSelectedInvitees] = useState([])

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    fetchMyGroups()
    if (currentUser?.id) {
      try {
        signaling.emit('user:join', {
          userId: currentUser.id,
          displayName: currentUser.displayName || currentUser.username,
        })
      } catch (e) { console.warn('socket err', e) }
    }
    return () => {
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
      if (pcRef.current) { try { pcRef.current.close() } catch {}; pcRef.current = null }
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onO = ({ userId: uid }) => setOnlineUsers(prev => new Set([...prev, String(uid)]))
    const onOf = ({ userId: uid }) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(String(uid)); return n })
    signaling.on('presence:online', onO)
    signaling.on('presence:offline', onOf)
    return () => { signaling.off('presence:online', onO); signaling.off('presence:offline', onOf) }
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
          senderId: fromUserId, senderDisplayName: fromDisplayName || senderInfo?.displayName || 'User',
          text: message, ...(payload || {}), createdAt: new Date(timestamp).toISOString(), isRealtime: true,
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
    return () => { if (id) signaling.emit('group:leave', { groupId: id }) }
  }, [id, currentUser?.id])

  const fetchMyGroups = async () => {
    try {
      const res = await api.get('/groups')
      setGroupsList(res.data.groups || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }
  const fetchGroupDetail = async (gid) => {
    try { const res = await api.get(`/groups/${gid}`); setGroup(res.data) }
    catch (err) { console.error(err) }
  }
  const fetchGroupMessages = async (gid) => {
    try {
      const res = await api.get(`/groups/${gid}/messages`)
      const msgs = (res.data.messages || []).slice().reverse()
      setMessages(msgs)
    } catch (err) { console.error(err) }
  }
  const fetchGroupMembers = async (gid) => {
    try { const res = await api.get(`/groups/${gid}/members`); setMembers(res.data.members || []) }
    catch (err) { console.error(err) }
  }

  const openEditGroup = () => {
    setEditGroupName(group?.name || '')
    setEditGroupDescription(group?.description || '')
    setShowEditGroup(true)
  }

  const saveGroupDetails = async (e) => {
    e.preventDefault()
    if (!id || !editGroupName.trim()) return
    setSavingGroup(true)
    try {
      const res = await api.put(`/groups/${id}`, { name: editGroupName.trim(), description: editGroupDescription.trim() || null })
      setGroup(p => ({ ...p, ...res.data }))
      setGroupsList(p => p.map(i => String(i.id) === String(id) ? { ...i, name: editGroupName.trim(), description: editGroupDescription.trim() || null } : i))
      setShowEditGroup(false)
      addToast({ type: 'success', text: 'Info grup diperbarui' })
    } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal' }) }
    finally { setSavingGroup(false) }
  }

  const uploadChatFile = async (file) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/chat/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res.data
    } finally { setUploading(false) }
  }

  const sendGroupPayload = async (payload) => {
    if (!id) return
    setSending(true)
    const temporaryId = 'opt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const optimistic = {
      id: temporaryId, senderId: currentUser?.id, senderDisplayName: currentUser?.displayName,
      createdAt: new Date().toISOString(), isMine: true, isPending: true, ...payload,
    }
    setMessages(p => [...p, optimistic])
    setNewMessage('')
    setShowStickers(false)
    setShowAttachMenu(false)

    try {
      const res = await api.post(`/groups/${id}/messages`, { ...payload, replyToId: replyingTo?.id || payload.replyToId || null })
      setMessages(p => p.map(m => m.id === temporaryId
        ? { ...m, ...(res.data || {}), id: res.data?.id || m.id, isPending: false, sent: true } : m))
      setReplyingTo(null)
      try {
        let pt = ''
        if (payload.text) pt = payload.text
        else if (payload.pollId) pt = '[Polling]'
        else if (payload.documentUrl) pt = '[Dokumen]'
        else if (payload.imageUrl) pt = '[Gambar]'
        else if (payload.voiceUrl) pt = '[Voice Note]'
        else if (payload.locationName) pt = '[Lokasi]'
        if (pt) signaling.emit('group:sendMessage', { groupId: id, message: pt, payload })
      } catch {}
    } catch (err) {
      console.error(err)
      setMessages(p => p.map(m => m.id === temporaryId ? { ...m, isPending: false, isError: true } : m))
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal kirim pesan' })
    } finally { setSending(false) }
  }

  const editMessage = async (message) => {
    const t = message.text !== undefined ? message.text : window.prompt('Edit pesan', '')
    if (!t?.trim()) return
    try {
      const { data } = await api.put(`/chat/messages/${message.id}`, { text: t.trim() })
      setMessages(p => p.map(i => i.id === message.id ? { ...i, text: data.text, editedAt: data.editedAt } : i))
    } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal edit' }) }
  }
  const deleteMessage = async (message) => {
    if (!window.confirm('Hapus pesan ini?')) return
    try {
      await api.delete(`/chat/messages/${message.id}`)
      setMessages(p => p.map(i => i.id === message.id ? { ...i, text: 'Pesan dihapus', deletedAt: new Date().toISOString(), imageUrl: null, videoUrl: null, voiceUrl: null, documentUrl: null, locationName: null } : i))
    } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal hapus' }) }
  }
  const deleteMessageForMe = (message) => setMessages(p => p.filter(i => i.id !== message.id))
  const reportMessage = async (message, category, details) => {
    try { await api.post('/reports', { category, details, targetGroupId: id, targetMessageId: message.id }); addToast({ type: 'success', text: 'Laporan terkirim' }) }
    catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal melaporkan' }) }
  }
  const addGroupMember = () => {
    setShowInviteModal(true)
  }
  const reportGroup = async () => {
    const d = window.prompt('Jelaskan masalah group (min 10 karakter)')
    if (!d || d.trim().length < 10) return
    try { await api.post('/reports', { category: 'Group', details: d, targetGroupId: id }); addToast({ type: 'success', text: 'Laporan terkirim' }) }
    catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal' }) }
  }
  const downloadAllMedia = async () => {
    const media = messages.flatMap(m => {
      if (m.deletedAt) return []
      const items = []
      if (m.documentUrl) items.push([m.documentUrl, m.documentName || `dok-${m.id}`])
      if (m.voiceUrl) items.push([m.voiceUrl, `vn-${m.id}.webm`])
      if (m.imageUrl) items.push([m.imageUrl, `img-${m.id}`])
      if (m.videoUrl) items.push([m.videoUrl, `vid-${m.id}`])
      return items
    })
    if (!media.length) { addToast({ type: 'info', text: 'Tidak ada media' }); return }
    let ok = 0
    for (const [u, n] of media) if (await downloadMedia(u, n)) ok++
    addToast({ type: ok ? 'success' : 'error', text: ok ? `${ok}/${media.length} media diunduh` : 'Gagal mengunduh media' })
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
    const temp = 'stk_' + Date.now()
    setMessages(p => [...p, { id: temp, senderId: currentUser?.id, sticker: stk, createdAt: new Date().toISOString(), isMine: true, isPending: true }])
    setShowStickers(false)
    try {
      await api.post(`/groups/${id}/messages`, { text: stk })
      setMessages(p => p.map(m => m.id === temp ? { ...m, isPending: false } : m))
      try { signaling.emit('group:sendMessage', { groupId: id, message: stk }) } catch {}
    } catch { addToast({ type: 'error', text: 'Gagal kirim stiker' }) }
    finally { setSending(false) }
  }

  const handleFilePick = async (file, kind) => {
    if (!file) return
    try {
      const up = await uploadChatFile(file)
      if (!up?.url) return
      if (up.type === 'image' || kind === 'image') await sendGroupPayload({ imageUrl: up.url, text: newMessage.trim() || null })
      else if (up.type === 'voice') await sendGroupPayload({ voiceUrl: up.url, voiceDuration: up.duration || 0 })
      else await sendGroupPayload({
        documentUrl: up.url,
        documentName: up.name || file.name,
        documentSize: up.size || file.size,
        text: newMessage.trim() || null,
      })
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal upload' })
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      recordedChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const dur = recordDuration
        setIsRecording(false); setRecordDuration(0)
        if (recordTimerRef.current) clearInterval(recordTimerRef.current)
        if (recordedChunksRef.current.length === 0 || dur < 1) { addToast({ type: 'info', text: 'Rekaman terlalu pendek' }); return }
        const mime = mr.mimeType || 'audio/webm'
        const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp3') ? 'mp3' : 'webm'
        const blob = new Blob(recordedChunksRef.current, { type: mime })
        const f = new File([blob], `vn.${ext}`, { type: mime })
        try { const up = await uploadChatFile(f); if (up?.url) await sendGroupPayload({ voiceUrl: up.url, voiceDuration: dur }) }
        catch { addToast({ type: 'error', text: 'Gagal kirim voice note' }) }
      }
      mr.start()
      setIsRecording(true); setRecordDuration(0)
      const st = Date.now()
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      recordTimerRef.current = setInterval(() => setRecordDuration(Math.floor((Date.now() - st) / 1000)), 500)
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: 'Gagal rekam: ' + (err?.message || 'Izin mic ditolak') })
    }
  }

  const stopRecording = () => { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop() }
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      recordedChunksRef.current = []
      mediaRecorderRef.current.onstop = () => {}
      try { mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()) } catch {}
      mediaRecorderRef.current.stop()
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    setIsRecording(false); setRecordDuration(0)
  }

  const sendLocation = async () => {
    if (!navigator.geolocation) { addToast({ type: 'error', text: 'Browser tidak mendukung Geolocation' }); return }
    setUploading(true)
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }))
      const { latitude, longitude } = pos.coords
      await sendGroupPayload({ locationName: `Lokasi (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`, latitude, longitude })
    } catch (err) { addToast({ type: 'error', text: 'Gagal lokasi: ' + (err?.message || 'Izin ditolak') }) }
    finally { setUploading(false); setShowAttachMenu(false) }
  }

  const createPoll = async () => {
    const q = pollQuestion.trim()
    const opts = pollOptions.map(o => o.trim()).filter(Boolean)
    if (!q) { addToast({ type: 'error', text: 'Pertanyaan belum diisi' }); return }
    if (opts.length < 2) { addToast({ type: 'error', text: 'Minimal 2 pilihan' }); return }
    try {
      setUploading(true)
      const pr = await api.post(`/chat/group/${id}/poll`, { question: q, options: opts })
      const pollId = pr.data?.id
      if (!pollId) { addToast({ type: 'error', text: 'Gagal polling' }); return }
      await sendGroupPayload({ pollId, text: null })
      setPollQuestion(''); setPollOptions(['', '']); setShowPollModal(false)
    } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal polling' }) }
    finally { setUploading(false) }
  }
  const addPollOption = () => pollOptions.length < 10 && setPollOptions([...pollOptions, ''])
  const removePollOption = (idx) => pollOptions.length > 2 && setPollOptions(pollOptions.filter((_, i) => i !== idx))
  const amIAdmin = () => {
    if (!members.length || !currentUser?.id) return true
    const me = members.find(m => String(m.userId) === String(currentUser.id))
    return me && (me.role === 'owner' || me.role === 'admin')
  }
  const leaveGroup = async () => {
    if (!id) return
    try { await api.post(`/groups/${id}/leave`); addToast({ type: 'success', text: 'Kamu keluar grup' }); navigate('/groups') }
    catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal keluar grup' }) }
  }
  const kickMember = async (uid) => {
    if (!id) return
    if (!window.confirm('Yakin ingin mengeluarkan anggota ini dari grup?')) return
    try { await api.post(`/groups/${id}/kick`, { userId: uid }); addToast({ type: 'success', text: 'Anggota dikeluarkan' }); fetchGroupMembers(id) }
    catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal keluarkan' }) }
  }

  // Search users for invite
  const searchInviteUsers = async (q) => {
    if (!q || q.length < 2) { setInviteResults([]); return }
    setInviteLoading(true)
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      const existingIds = members.map(m => String(m.userId || m.id))
      setInviteResults((res.data.users || []).filter(u => !existingIds.includes(String(u.id))))
    } catch (err) { console.error('search invite', err) }
    finally { setInviteLoading(false) }
  }

  const toggleInvitee = (user) => {
    setSelectedInvitees(prev => {
      const exists = prev.find(u => u.id === user.id)
      if (exists) return prev.filter(u => u.id !== user.id)
      return [...prev, user]
    })
  }

  const inviteMembers = async () => {
    if (!id || selectedInvitees.length === 0) return
    let invited = 0
    for (const user of selectedInvitees) {
      try {
        await api.post(`/groups/${id}/members`, { userId: user.id })
        invited++
      } catch (err) { console.error('invite err', err) }
    }
    if (invited > 0) {
      addToast({ type: 'success', text: `${invited} anggota ditambahkan` })
      fetchGroupMembers(id)
    }
    setSelectedInvitees([])
    setInviteSearch('')
    setInviteResults([])
    setShowInviteModal(false)
  }

  // Extract shared media from messages
  const sharedMedia = (() => {
    const images = []
    const videos = []
    const docs = []
    const links = []
    const locs = []
    messages.forEach(m => {
      if (m.deletedAt) return
      if (m.imageUrl) images.push({ url: m.imageUrl, id: m.id, sender: m.senderDisplayName, time: m.createdAt })
      if (m.videoUrl) videos.push({ url: m.videoUrl, id: m.id, sender: m.senderDisplayName, time: m.createdAt })
      if (m.documentUrl) docs.push({ url: m.documentUrl, name: m.documentName, size: m.documentSize, id: m.id, sender: m.senderDisplayName, time: m.createdAt })
      if (m.text) {
        const urlMatch = m.text.match(/https?:\/\/[^\s]+/gi)
        if (urlMatch) urlMatch.forEach(u => links.push({ url: u, id: m.id, sender: m.senderDisplayName, time: m.createdAt }))
      }
      if (m.latitude != null && m.longitude != null) locs.push({ lat: m.latitude, lng: m.longitude, name: m.locationName, id: m.id, sender: m.senderDisplayName, time: m.createdAt })
    })
    return { images, videos, docs, links, locs }
  })()

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
      localStreamRef.current = stream
      if (selfVideoRef.current && type === 'video') selfVideoRef.current.srcObject = stream

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
      pcRef.current = pc
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      pc.ontrack = (ev) => { if (peerVideoRef.current && ev.streams?.[0]) peerVideoRef.current.srcObject = ev.streams[0] }
      const callRoomId = 'call_group_' + (id || 'x') + '_' + Date.now()
      pc.onicecandidate = (ev) => { if (!ev.candidate) return; try { signaling.emit('call:ice', { roomId: callRoomId, candidate: ev.candidate }) } catch {} }
      pendingCandidatesRef.current = []

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      setCallCamOn(type === 'video'); setCallMicOn(true); setCallElapsed(0)
      setActiveCall({ type, roomId: callRoomId, callId: null, groupId: id, groupName: group?.name || 'Group Call', status: 'calling', startedAt: null, role: 'initiator' })
      try { const cr = await api.post('/calls/initiate', { type, groupId: id }); setActiveCall(p => p ? { ...p, callId: cr.data?.id } : p) } catch (err) { addToast({ type: 'error', text: err?.response?.data?.message || 'Gagal catat panggilan' }) }
      try {
        signaling.emit('call:start', { callId: callRoomId, type, roomId: callRoomId, groupId: id, offer, initiatorInfo: { userId: currentUser?.id, displayName: currentUser?.displayName } })
      } catch (e) { console.warn('call start err', e) }
      setTimeout(() => {
        setActiveCall(p => p?.status === 'calling' ? { ...p, status: 'connected', startedAt: Date.now() } : p)
        const s = Date.now()
        if (callTimerRef.current) clearInterval(callTimerRef.current)
        callTimerRef.current = setInterval(() => setCallElapsed(Math.floor((Date.now() - s) / 1000)), 1000)
      }, 2500)
    } catch (err) {
      console.error(err)
      addToast({ type: 'error', text: 'Gagal panggilan: ' + (err?.message || 'Izin kamera/mic ditolak') })
      endCallInternal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall, currentUser, id, group])

  useEffect(() => {
    if (!activeCall?.roomId || activeCall.role !== 'initiator') return
    const { roomId } = activeCall
    const onAnswered = async ({ roomId: rid, answer }) => {
      if (rid !== roomId || !answer || !pcRef.current) return
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        for (const c of pendingCandidatesRef.current.splice(0)) await pcRef.current.addIceCandidate(new RTCIceCandidate(c))
        setActiveCall(p => p?.roomId === roomId ? { ...p, status: 'connected', startedAt: p.startedAt || Date.now() } : p)
      } catch (e) { console.warn(e) }
    }
    const onIce = ({ roomId: rid, candidate }) => {
      if (rid !== roomId || !candidate || !pcRef.current) return
      if (pcRef.current.remoteDescription) pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      else pendingCandidatesRef.current.push(candidate)
    }
    signaling.on('call:answered', onAnswered)
    signaling.on('call:ice', onIce)
    return () => { signaling.off('call:answered', onAnswered); signaling.off('call:ice', onIce) }
  }, [activeCall])

  useEffect(() => {
    const onIncoming = async ({ type, roomId, groupId, offer, fromUserId, fromSocket, initiatorInfo }) => {
      if (!id || String(groupId) !== String(id) || String(fromUserId) === String(currentUser?.id) || activeCall) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
        localStreamRef.current = stream
        if (selfVideoRef.current && type === 'video') selfVideoRef.current.srcObject = stream
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
        pcRef.current = pc
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
        pc.ontrack = (ev) => { if (peerVideoRef.current && ev.streams?.[0]) peerVideoRef.current.srcObject = ev.streams[0] }
        pc.onicecandidate = (ev) => { if (ev.candidate) signaling.emit('call:ice', { roomId, candidate: ev.candidate, toSocket: fromSocket }) }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const ans = await pc.createAnswer()
        await pc.setLocalDescription(ans)
        signaling.emit('call:answer', { roomId, answer: ans, toSocket: fromSocket })
        setCallCamOn(type === 'video'); setCallMicOn(true); setCallElapsed(0)
        setActiveCall({ type, roomId, groupId, groupName: group?.name || 'Group Call', status: 'connected', startedAt: Date.now(), role: 'receiver', targetUserId: fromUserId, targetDisplayName: initiatorInfo?.displayName || 'Anggota grup' })
        const s = Date.now()
        callTimerRef.current = setInterval(() => setCallElapsed(Math.floor((Date.now() - s) / 1000)), 1000)
        addToast({ type: 'success', text: 'Panggilan grup diterima' })
      } catch (err) { addToast({ type: 'error', text: 'Gagal menerima panggilan grup' }) }
    }
    signaling.on('call:incoming', onIncoming)
    return () => signaling.off('call:incoming', onIncoming)
  }, [activeCall, addToast, currentUser, group, id])

  const endCallInternal = (remote = false) => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    if (!remote && activeCall?.roomId) { try { signaling.emit('call:end', { roomId: activeCall.roomId, reason: 'ended' }) } catch {} }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
    if (selfVideoRef.current) selfVideoRef.current.srcObject = null
    if (peerVideoRef.current) peerVideoRef.current.srcObject = null
    if (pcRef.current) { try { pcRef.current.close() } catch {}; pcRef.current = null }
    if (!remote && activeCall?.callId) {
      api.post(`/calls/${activeCall.callId}/end`, { endedAt: new Date().toISOString(), durationSeconds: callElapsed }).catch(() => {})
    }
    setActiveCall(null); setCallElapsed(0)
  }
  const endCall = () => endCallInternal(false)

  useEffect(() => {
    const h = ({ roomId }) => { if (activeCall && roomId === activeCall.roomId) endCallInternal(true) }
    signaling.on('call:ended', h)
    return () => signaling.off('call:ended', h)
  }, [activeCall])

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#111b21] text-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#202c33] border-t-emerald-500 animate-spin" />
      </div>
    )
  }

  const selectedId = id
  const showSidebar = !selectedId
  // On desktop always show sidebar (split view). On mobile show the appropriate pane.
  // This is the key fix for "stuck on mobile" — avoid side-by-side clashing.

  return (
    <div className="h-screen w-full bg-[#0b141a] text-white flex overflow-hidden">

      {/* ======= SIDEBAR (Group List) — WhatsApp WA Style ======= */}
      <aside
        className={`${
          showSidebar ? 'flex' : 'hidden sm:flex'
        } w-full sm:w-[380px] shrink-0 h-full flex-col border-r border-[#222d34] bg-[#111b21] relative`}
      >
        {/* Header — WhatsApp style */}
        <div className="h-[60px] px-4 flex items-center justify-between bg-[#202c33] shrink-0">
          <div className="flex items-center gap-3">
            {selectedId && (
              <button onClick={() => navigate('/groups')} className="sm:hidden w-10 h-10 rounded-full -ml-2 hover:bg-white/5 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-[#aebac1]" />
              </button>
            )}
            <h1 className="font-bold text-[20px] text-[#e9edef]">Grup</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/camera')}
              title="Status"
              className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1]"
            >
              <Camera className="w-[22px] h-[22px]" />
            </button>
            <button
              title="Menu"
              className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1]"
            >
              <Menu className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>

        {/* Search bar — WhatsApp style */}
        <div className="px-3 py-1.5 bg-[#111b21] shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8696a0]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={leftTab === 'chats' ? 'Cari grup...' : 'Cari riwayat panggilan...'}
              className="w-full bg-[#202c33] rounded-lg pl-10 pr-4 py-[7px] text-[14px] text-[#e9edef] placeholder:text-[#8696a0] outline-none"
            />
          </div>
        </div>

        {/* Tabs — WhatsApp pill style */}
        <div className="px-3 pb-1.5 bg-[#111b21] shrink-0">
          <div className="flex gap-1 p-[3px] rounded-lg bg-[#202c33]">
            <button
              onClick={() => setLeftTab('chats')}
              className={`flex-1 text-[13px] font-semibold py-[6px] rounded-md transition-all duration-200 ${
                leftTab === 'chats' ? 'bg-[#00a884] text-[#111b21] shadow-sm' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <MessageCircle className="w-[14px] h-[14px] inline mr-1.5 -mt-[1px]" /> Grup
            </button>
            <button
              onClick={() => setLeftTab('calls')}
              className={`flex-1 text-[13px] font-semibold py-[6px] rounded-md transition-all duration-200 ${
                leftTab === 'calls' ? 'bg-[#00a884] text-[#111b21] shadow-sm' : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <Phone className="w-[14px] h-[14px] inline mr-1.5 -mt-[1px]" /> Riwayat
            </button>
          </div>
        </div>

        {/* Group list / History list */}
        <div className="flex-1 overflow-y-auto">
          {leftTab === 'chats' ? (
            filteredGroups.length === 0 ? (
              /* Empty state — clean, centered */
              <div className="flex flex-col items-center justify-center h-full px-6 pb-20">
                <div className="w-20 h-20 rounded-full bg-[#00a884]/10 border border-[#00a884]/20 flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-[#00a884]/50" />
                </div>
                <p className="text-[15px] font-medium text-[#e9edef] mb-1">Belum ada grup</p>
                <p className="text-[13px] text-[#8696a0] text-center leading-relaxed">
                  Buat grup untuk ngobrol bareng temen-temen!
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-[14px] font-bold transition-all duration-200 shadow-lg shadow-[#00a884]/20"
                >
                  <Plus className="w-4 h-4" /> Buat Grup
                </button>
              </div>
            ) : (
              <ul>
                {filteredGroups.map((g) => {
                  const active = String(selectedId) === String(g.id)
                  return (
                    <li key={g.id}>
                      <button
                        onClick={() => navigate(`/groups/${g.id}`)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-[10px] transition-colors duration-150 ${
                          active ? 'bg-[#2a3942]' : 'hover:bg-[#202c33] active:bg-[#182229]'
                        }`}
                      >
                        <Avatar
                          name={g.name}
                          color={g.avatarColor || 'from-teal-500 via-emerald-500 to-green-500'}
                          size={49}
                        />
                        <div className="flex-1 min-w-0 py-[2px]">
                          <div className="flex items-center justify-between mb-[2px]">
                            <h3 className="font-semibold text-[16px] text-[#e9edef] truncate pr-2 leading-tight">{g.name}</h3>
                            <span className={`text-[12px] font-medium shrink-0 ${g.unreadCount > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>{fmtTime(g.lastMessageAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[14px] text-[#8696a0] truncate">
                              {g.lastMessage ? (
                                <span className="truncate inline-block max-w-full">{g.lastMessage}</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 inline opacity-60" />
                                  {g.memberCount || 0} anggota
                                </span>
                              )}
                            </p>
                            {g.unreadCount > 0 && (
                              <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#00a884] text-[#111b21] text-[11px] font-bold">
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
            /* Call history tab */
            <div className="flex flex-col items-center justify-center h-full px-6 pb-20">
              <div className="w-20 h-20 rounded-full bg-[#00a884]/10 border border-[#00a884]/20 flex items-center justify-center mb-4">
                <Phone className="w-10 h-10 text-[#00a884]/50" />
              </div>
              <p className="text-[15px] font-medium text-[#e9edef] mb-1">Belum ada riwayat</p>
              <p className="text-[13px] text-[#8696a0] text-center leading-relaxed">
                Buka grup, lalu gunakan tombol 📞 / 🎥 di header untuk memulai panggilan.
              </p>
            </div>
          )}
        </div>

        {/* FAB — Floating Action Button (WhatsApp style) */}
        <button
          onClick={() => setShowCreateGroup(true)}
          title="Buat grup baru"
          className="absolute bottom-6 right-5 w-[56px] h-[56px] rounded-2xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] flex items-center justify-center shadow-xl shadow-[#00a884]/30 transition-all duration-200 hover:scale-105 active:scale-95 z-10"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>

        {/* Create Group Modal */}
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

      {/* ======= CHAT AREA (Right Panel) — WhatsApp Style ======= */}
      <section
        className={`${
          selectedId ? 'flex' : 'hidden sm:flex'
        } flex-1 h-full flex-col min-w-0 bg-[#0b141a] relative`}
      >
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-b-[6px] border-[#00a884]">
            <div className="w-60 h-60 rounded-full bg-gradient-to-br from-teal-500/20 via-emerald-500/15 to-green-500/20 flex items-center justify-center mb-8 border border-white/5">
              <Users className="w-28 h-28 text-[#00a884]/40" />
            </div>
            <h2 className="text-[32px] font-light mb-3 text-[#e9edef] tracking-tight">Novarix Group Chat</h2>
            <p className="text-[#8696a0] max-w-lg text-[14px] leading-6 mb-10">
              Kirim pesan grup dengan teks, stiker, gambar, dokumen, voice note, polling, dan panggilan suara/video grup. Pilih grup di panel kiri untuk mulai.
            </p>
            <div className="flex items-center gap-2 text-[12px] text-[#8696a0]">
              <Shield className="w-3.5 h-3.5" />
              <span>Pesan dikirim via Socket.IO secara real-time</span>
            </div>
          </div>
        ) : (
          <>
            {/* CHAT HEADER */}
            <header className="h-[60px] shrink-0 px-3 sm:px-4 flex items-center gap-3 bg-[#202c33] border-b border-[#222d34]">
              <button
                onClick={() => navigate('/groups')}
                className="w-10 h-10 rounded-full -ml-2 hover:bg-white/5 flex items-center justify-center text-[#aebac1] sm:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar
                name={group?.name || 'Grup'}
                color={group?.avatarColor || 'from-teal-500 via-emerald-500 to-green-500'}
                size={40}
              />
              <div
                className="flex-1 min-w-0 cursor-pointer hover:bg-white/[0.03] -mx-2 px-2 py-1.5 rounded-lg"
                onClick={() => setShowGroupInfo(v => !v)}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h2 className="font-semibold text-[16px] text-[#e9edef] truncate">{group?.name || 'Memuat...'}</h2>
                  {group?.verified && <Shield className="w-3.5 h-3.5 text-[#00a884]" />}
                </div>
                <div className="text-[12px] text-[#8696a0]">
                  {members.length > 0 && (
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      {members.slice(0, 3).map((m, i) => (
                        <span key={m.userId || m.id || i} className="truncate max-w-[80px]">{m.displayName || m.username || 'Anggota'}{i < Math.min(2, members.length - 1) ? ',' : ''}</span>
                      ))}
                      {members.length > 3 && <span className="truncate">+{members.length - 3} lainnya</span>}
                    </span>
                  )}
                  {typingText && <span className="text-[#00a884] ml-2">· {typingText}</span>}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => startCall('voice')}
                  className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1] transition"
                  title="Voice Call Grup"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1] transition"
                  title="Video Call Grup"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowGroupInfo(v => !v)}
                  className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1] transition"
                  title="Info grup"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* MAIN CONTENT WRAPPER — chat + optional group info drawer */}
            <div className="flex-1 flex min-h-0 relative overflow-hidden">

              {/* CHAT MESSAGES + INPUT */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Messages area with dots pattern like WA dark theme */}
                <div
                  className="flex-1 overflow-y-auto px-4 sm:px-[8%] py-4"
                  style={{
                    backgroundColor: '#0b141a',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='%23182229' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                >
                  <ul className="space-y-2">
                    <li className="flex justify-center my-3">
                      <div className="px-3 py-1.5 rounded-lg bg-[#182229] text-[12.5px] text-[#8696a0] shadow-sm">
                        <Shield className="w-3 h-3 inline mr-1.5 -mt-0.5" />
                        Novarix Group Chat · {group?.name || 'Grup'}
                      </div>
                    </li>

                    {messages.length === 0 && (
                      <li className="flex justify-center">
                        <div className="px-4 py-2 rounded-lg bg-[#182229] text-[12.5px] text-[#8696a0] shadow-sm">
                          Belum ada pesan. Kirim pesan pertama!
                        </div>
                      </li>
                    )}

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
                        <li key={m.id || idx} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && (
                            <div className="w-8 shrink-0 self-end">
                              {showAvatar ? (
                                <Avatar name={senderName} color={senderColor || 'from-teal-500 via-emerald-500 to-green-500'} size={28} online={onlineUsers.has(String(m.senderId))} />
                              ) : null}
                            </div>
                          )}
                          <div className={`flex flex-col max-w-[78%] ${mine ? 'items-end' : 'items-start'}`}>
                            {(!prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()) && (
                              <div className="self-center my-2 px-3 py-1 rounded-lg bg-[#182229] text-[11.5px] font-medium text-[#8696a0] shadow-sm">{fmtDateLabel(m.createdAt)}</div>
                            )}
                            {!mine && showAvatar && (
                              <span className="text-[11px] font-semibold text-[#00a884] mb-0.5 px-1">{senderName}</span>
                            )}
                            <div className="flex items-end gap-1">
                              <div
                                className={`px-2.5 py-[5px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                                  mine
                                    ? 'bg-[#005c4b] rounded-[7.5px] rounded-tr-[0] text-[#e9edef]'
                                    : 'bg-[#202c33] rounded-[7.5px] rounded-tl-[0] text-[#e9edef]'
                                }`}
                              >
                                {m.deletedAt ? (
                                  <p className="text-xs italic text-[#8696a0] px-1 py-0.5">Pesan dihapus</p>
                                ) : (
                                  <>
                                    {m.replyToId && (
                                      <div className="mb-1.5 border-l-[3px] border-[#00a884] bg-white/5 rounded-r-md pl-2 pr-3 py-1.5 text-[12px] opacity-90">
                                        Membalas pesan
                                      </div>
                                    )}
                                    <div className="px-1 pb-1 pt-0.5">
                                      <MessageBubbleContent m={m} />
                                    </div>
                                    <div className="flex items-center justify-end gap-1 -mt-1 mb-0.5 mr-0.5 pr-0.5 select-none">
                                      <span className="text-[10.5px] text-[#8696a0]/90">{fmtTime(m.createdAt)}</span>
                                      {m.editedAt && <span className="text-[10.5px] text-[#8696a0]/90">· diedit</span>}
                                      {mine && (
                                        <span className={`ml-0.5 text-[10.5px] ${
                                          m.isError ? 'text-red-400' : m.isPending ? 'text-[#8696a0]/70' : 'text-[#53bdeb]'
                                        }`}>
                                          {m.isError ? '· gagal' : m.isPending ? '· ✓' : '· ✓✓'}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                              <MessageActions
                                message={m}
                                canEdit={mine && !m.deletedAt}
                                onReply={setReplyingTo}
                                onEdit={(msg) => { setEditingMessage(msg); setNewMessage(msg.text || '') }}
                                onDeleteForMe={deleteMessageForMe}
                                onDeleteForEveryone={deleteMessage}
                                onReport={reportMessage}
                              />
                            </div>
                          </div>
                        </li>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </ul>
                </div>

                {/* COMPOSER (WA-style) */}
                <form onSubmit={handleSendMessage} className="shrink-0 px-3 sm:px-4 py-3 bg-[#202c33]">
                  <div className="flex items-end gap-2 max-w-5xl mx-auto relative">
                    {(replyingTo || editingMessage || isRecording) && (
                      <div className={`absolute -top-[46px] left-0 right-0 flex items-center justify-between rounded-lg ${
                        isRecording ? 'bg-cyan-500/10 border-cyan-500/30' : replyingTo ? 'bg-[#2a3942] border-white/5' : 'bg-amber-500/10 border-amber-500/30'
                      } border px-3 py-2 text-xs`}>
                        <span className="flex items-center gap-2 min-w-0">
                          {isRecording && <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse shrink-0" />}
                          <span className="text-[#e9edef] truncate">
                            {isRecording ? `Merekam voice note · ${formatDuration(recordDuration)}` : replyingTo ? `Membalas: ${replyingTo.text || 'lampiran'}` : 'Mengedit pesan'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecording) cancelRecording()
                            else { setReplyingTo(null); setEditingMessage(null); setNewMessage('') }
                          }}
                          className="shrink-0 w-7 h-7 rounded hover:bg-white/5 flex items-center justify-center text-[#aebac1]"
                          title={isRecording ? 'Batal rekam' : 'Batal'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {isRecording && (
                      <div className="absolute -top-[84px] left-0 right-0 rounded-xl border border-cyan-500/30 bg-[#182229] px-4 py-2.5 flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span className="text-sm font-semibold text-cyan-200">Merekam voice note...</span>
                        <span className="font-mono text-cyan-200 text-sm tabular-nums">{formatDuration(recordDuration)}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <button type="button" onClick={cancelRecording} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2a3942] hover:bg-[#384a55] text-white text-xs">
                            <X className="w-3.5 h-3.5" /> Batal
                          </button>
                          <button type="button" onClick={stopRecording} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-xs font-bold">
                            <StopCircle className="w-3.5 h-3.5" /> Kirim
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Attach */}
                    <div className="flex items-center gap-0.5 shrink-0 relative">
                      <button
                        type="button"
                        onClick={() => { setShowAttachMenu(v => !v); setShowStickers(false) }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                          showAttachMenu ? 'text-[#00a884]' : 'text-[#8696a0] hover:text-[#e9edef]'
                        }`}
                        title="Lampirkan"
                      >
                        <Paperclip className="w-5 h-5 -rotate-45" />
                      </button>
                      {showAttachMenu && (
                        <div className="absolute bottom-12 left-0 z-20 w-56 rounded-xl border border-[#222d34] bg-[#233138] shadow-2xl overflow-hidden">
                          <button type="button" onClick={() => { imgInputRef.current?.click(); setShowAttachMenu(false) }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-[#2a3942] flex items-center gap-3 text-[#e9edef]">
                            <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center"><Image className="w-4 h-4" /></span>
                            <div><p className="font-semibold text-xs">Gambar & Video</p><p className="text-[10px] text-[#8696a0]">JPG, PNG, GIF, MP4</p></div>
                          </button>
                          <button type="button" onClick={() => { docInputRef.current?.click(); setShowAttachMenu(false) }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-[#2a3942] flex items-center gap-3 text-[#e9edef] border-t border-[#1f2a30]">
                            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center"><FileText className="w-4 h-4" /></span>
                            <div><p className="font-semibold text-xs">Dokumen</p><p className="text-[10px] text-[#8696a0]">PDF, DOC, XLS, ZIP</p></div>
                          </button>
                          <button type="button" onClick={sendLocation} disabled={uploading}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-[#2a3942] flex items-center gap-3 text-[#e9edef] border-t border-[#1f2a30] disabled:opacity-60">
                            <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center"><MapPin className="w-4 h-4" /></span>
                            <div><p className="font-semibold text-xs">Lokasi</p><p className="text-[10px] text-[#8696a0]">Kirim lokasi sekarang</p></div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!amIAdmin()) { addToast({ type: 'error', text: 'Hanya admin yang bisa buat polling' }); return }
                              setShowPollModal(true); setShowAttachMenu(false)
                            }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-[#2a3942] flex items-center gap-3 text-[#e9edef] border-t border-[#1f2a30]"
                          >
                            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></span>
                            <div><p className="font-semibold text-xs">Polling</p><p className="text-[10px] text-[#8696a0]">Buat polling grup</p></div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mic / Recording */}
                    {!newMessage.trim() ? (
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); startRecording() }}
                        onMouseUp={(e) => { e.preventDefault(); if (isRecording) stopRecording() }}
                        onMouseLeave={() => { if (isRecording) stopRecording() }}
                        onTouchStart={(e) => { e.preventDefault(); startRecording() }}
                        onTouchEnd={(e) => { e.preventDefault(); if (isRecording) stopRecording() }}
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition ${
                          isRecording
                            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                            : 'text-[#8696a0] hover:text-[#e9edef]'
                        }`}
                        title="Tahan untuk merekam voice note"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    ) : null}

                    {/* Textarea */}
                    <div className="flex-1 relative">
                      <textarea
                        rows={1}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                        placeholder="Ketik pesan..."
                        className="w-full resize-none bg-[#2a3942] rounded-lg px-4 py-[10px] text-[15px] text-[#e9edef] placeholder:text-[#8696a0] outline-none min-h-[42px] max-h-[140px]"
                        style={{ lineHeight: 1.4 }}
                      />
                      <div className="flex items-center gap-1 absolute right-2 bottom-2">
                        <button type="button" onClick={() => { setShowStickers(v => !v); setShowAttachMenu(false) }}
                          className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-[#8696a0] hover:text-[#e9edef]" title="Emoji & Stiker">
                          <Smile className="w-5 h-5" />
                        </button>
                      </div>

                      {showStickers && (
                        <div className="absolute bottom-12 right-0 z-20 rounded-xl border border-[#222d34] bg-[#233138] shadow-2xl px-3 py-2.5 grid grid-cols-6 gap-1.5">
                          {STICKERS.map(s => (
                            <button
                              key={s} type="button" onClick={() => handleSendSticker(s)}
                              className="w-9 h-9 rounded-lg hover:bg-[#2a3942] flex items-center justify-center text-2xl transition"
                            >{s}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Send */}
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending || uploading || isRecording}
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition ${
                        !newMessage.trim() || sending || uploading || isRecording
                          ? 'text-[#8696a0] cursor-not-allowed'
                          : 'bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21]'
                      }`}
                      title="Kirim"
                    >
                      {sending || uploading
                        ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        : (newMessage.trim() ? <Send className="w-5 h-5 -rotate-[15deg]" /> : <Mic className="w-5 h-5" />)}
                    </button>

                    <input
                      ref={docInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f, 'doc'); e.target.value = '' }}
                    />
                    <input
                      ref={imgInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f, f.type.startsWith('video/') ? 'video' : 'image'); e.target.value = '' }}
                    />
                  </div>
                </form>
              </div>

              {/* ======= GROUP INFO DRAWER — WhatsApp Style ======= */}
              {showGroupInfo && (
                <aside className="flex w-full md:w-[380px] shrink-0 flex-col border-l border-[#222d34] bg-[#111b21] overflow-y-auto absolute inset-0 z-20 md:relative">
                  {/* Drawer Header */}
                  <div className="h-[60px] px-4 flex items-center gap-4 bg-[#202c33] shrink-0 sticky top-0 z-10">
                    <button onClick={() => setShowGroupInfo(false)} className="w-10 h-10 rounded-full -ml-2 hover:bg-white/5 flex items-center justify-center text-[#aebac1]">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-semibold text-[16px] text-[#e9edef]">Info grup</h3>
                  </div>

                  {/* Tabs: Info | Media | Anggota */}
                  <div className="px-3 py-1.5 bg-[#111b21] shrink-0 border-b border-[#222d34]">
                    <div className="flex gap-1 p-[3px] rounded-lg bg-[#202c33]">
                      {[
                        { key: 'info', label: 'Info', icon: <Users className="w-3.5 h-3.5 inline mr-1" /> },
                        { key: 'media', label: 'Media', icon: <Image className="w-3.5 h-3.5 inline mr-1" /> },
                        { key: 'members', label: 'Anggota', icon: <Users className="w-3.5 h-3.5 inline mr-1" /> },
                      ].map(t => (
                        <button key={t.key} onClick={() => setGroupInfoTab(t.key)}
                          className={`flex-1 text-[12px] font-semibold py-[6px] rounded-md transition-all duration-200 ${
                            groupInfoTab === t.key ? 'bg-[#00a884] text-[#111b21] shadow-sm' : 'text-[#8696a0] hover:text-[#e9edef]'
                          }`}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* === TAB: INFO === */}
                  {groupInfoTab === 'info' && (
                    <>
                      {/* Avatar + Name + Description */}
                      <div className="px-5 py-6 text-center border-b border-[#222d34]">
                        <Avatar name={group?.name || 'Grup'} color={group?.avatarColor || 'from-teal-500 via-emerald-500 to-green-500'} size={120} ring />
                        <h2 className="text-[20px] font-semibold mt-4 text-[#e9edef] flex items-center justify-center gap-2">
                          {group?.name || 'Grup'}
                          {group?.verified && <Shield className="w-4 h-4 text-[#00a884]" />}
                        </h2>
                        <p className="text-[13px] text-[#8696a0] mt-1">
                          Grup · {members.length} anggota
                        </p>
                        {group?.description && (
                          <p className="text-[13px] text-[#8696a0] mt-3 leading-relaxed">
                            {group.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons — WhatsApp Style */}
                      <div className="px-4 py-3 border-b border-[#222d34]">
                        <div className="flex items-center justify-around">
                          {[
                            { icon: <Plus className="w-5 h-5" />, label: 'Undang', color: 'bg-[#00a884] text-[#111b21]', onClick: () => setShowInviteModal(true) },
                            { icon: <Download className="w-5 h-5" />, label: 'Media', color: 'bg-[#202c33] text-[#aebac1]', onClick: () => { setGroupInfoTab('media') } },
                            ...(String(group?.ownerId) === String(currentUser?.id) ? [
                              { icon: <Pencil className="w-5 h-5" />, label: 'Edit', color: 'bg-[#202c33] text-[#aebac1]', onClick: openEditGroup },
                            ] : []),
                            { icon: <Search className="w-5 h-5" />, label: 'Cari', color: 'bg-[#202c33] text-[#aebac1]', onClick: () => {} },
                          ].map((btn, i) => (
                            <button key={i} onClick={btn.onClick}
                              className="flex flex-col items-center gap-1.5">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${btn.color} transition hover:opacity-80`}>
                                {btn.icon}
                              </div>
                              <span className="text-[11px] text-[#8696a0] font-medium">{btn.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mute, Notification, Encryption, Group Settings */}
                      <div className="border-b border-[#222d34]">
                        {[
                          { icon: <Volume2 className="w-5 h-5" />, label: 'Bisukan notifikasi', sub: 'Nonaktifkan notifikasi grup', toggle: true },
                          { icon: <Star className="w-5 h-5" />, label: 'Pesan berbintang', sub: 'Lihat pesan yang ditandai' },
                          { icon: <Shield className="w-5 h-5 text-[#00a884]" />, label: 'Enkripsi end-to-end', sub: 'Pesan terenkripsi' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#202c33] transition cursor-pointer">
                            <span className="text-[#aebac1]">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14.5px] text-[#e9edef]">{item.label}</p>
                              {item.sub && <p className="text-[12px] text-[#8696a0] mt-0.5">{item.sub}</p>}
                            </div>
                            {item.toggle && (
                              <div className="w-11 h-6 rounded-full bg-[#00a884] relative cursor-pointer">
                                <div className="absolute right-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Report & Leave */}
                      <div className="py-2">
                        <button onClick={reportGroup}
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#202c33] transition text-left">
                          <span className="text-amber-400"><Shield className="w-5 h-5" /></span>
                          <span className="text-[14.5px] text-amber-400">Laporkan grup</span>
                        </button>
                        <button onClick={leaveGroup}
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-[#202c33] transition text-left">
                          <span className="text-red-400"><LogOut className="w-5 h-5" /></span>
                          <span className="text-[14.5px] text-red-400">Keluar dari grup</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* === TAB: MEDIA === */}
                  {groupInfoTab === 'media' && (
                    <>
                      {/* Media Sub-tabs */}
                      <div className="px-3 py-2 border-b border-[#222d34]">
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                          {[
                            { key: 'all', label: 'Semua' },
                            { key: 'images', label: 'Foto', count: sharedMedia.images.length },
                            { key: 'videos', label: 'Video', count: sharedMedia.videos.length },
                            { key: 'docs', label: 'Dokumen', count: sharedMedia.docs.length },
                            { key: 'links', label: 'Tautan', count: sharedMedia.links.length },
                            { key: 'locs', label: 'Lokasi', count: sharedMedia.locs.length },
                          ].map(t => (
                            <button key={t.key} onClick={() => setMediaTab(t.key)}
                              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                                mediaTab === t.key ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                              }`}>
                              {t.label}{t.count != null ? ` (${t.count})` : ''}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Media Grid */}
                      <div className="flex-1 overflow-y-auto p-3">
                        {/* Images */}
                        {(mediaTab === 'all' || mediaTab === 'images') && sharedMedia.images.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-[12px] font-semibold text-[#00a884] mb-2 px-1">Foto · {sharedMedia.images.length}</h4>
                            <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                              {sharedMedia.images.map(img => (
                                <a key={img.id} href={resolveMedia(img.url)} target="_blank" rel="noopener noreferrer"
                                  className="aspect-square bg-[#202c33] overflow-hidden hover:opacity-80 transition">
                                  <img src={resolveMedia(img.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Videos */}
                        {(mediaTab === 'all' || mediaTab === 'videos') && sharedMedia.videos.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-[12px] font-semibold text-[#00a884] mb-2 px-1">Video · {sharedMedia.videos.length}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {sharedMedia.videos.map(vid => (
                                <a key={vid.id} href={resolveMedia(vid.url)} target="_blank" rel="noopener noreferrer"
                                  className="aspect-video bg-[#202c33] rounded-lg overflow-hidden hover:opacity-80 transition relative">
                                  <video src={resolveMedia(vid.url)} className="w-full h-full object-cover" preload="metadata" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Play className="w-8 h-8 text-white" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Documents */}
                        {(mediaTab === 'all' || mediaTab === 'docs') && sharedMedia.docs.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-[12px] font-semibold text-[#00a884] mb-2 px-1">Dokumen · {sharedMedia.docs.length}</h4>
                            <div className="space-y-1.5">
                              {sharedMedia.docs.map(doc => (
                                <a key={doc.id} href={resolveMedia(doc.url)} target="_blank" rel="noopener noreferrer"
                                  download={doc.name}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-[#202c33] hover:bg-[#2a3942] transition">
                                  <div className="w-10 h-10 rounded-lg bg-[#00a884]/15 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-[#00a884]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-[#e9edef] truncate font-medium">{doc.name || 'Dokumen'}</p>
                                    <p className="text-[11px] text-[#8696a0]">{formatBytes(doc.size)}</p>
                                  </div>
                                  <Download className="w-4 h-4 text-[#8696a0] shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Links */}
                        {(mediaTab === 'all' || mediaTab === 'links') && sharedMedia.links.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-[12px] font-semibold text-[#00a884] mb-2 px-1">Tautan · {sharedMedia.links.length}</h4>
                            <div className="space-y-1.5">
                              {sharedMedia.links.map((lnk, i) => (
                                <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 rounded-xl bg-[#202c33] hover:bg-[#2a3942] transition">
                                  <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                                    <Globe2 className="w-5 h-5 text-sky-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-sky-400 truncate">{lnk.url}</p>
                                    <p className="text-[11px] text-[#8696a0]">{lnk.sender || 'Anggota'}</p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Locations */}
                        {(mediaTab === 'all' || mediaTab === 'locs') && sharedMedia.locs.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-[12px] font-semibold text-[#00a884] mb-2 px-1">Lokasi · {sharedMedia.locs.length}</h4>
                            <div className="space-y-1.5">
                              {sharedMedia.locs.map((loc, i) => (
                                <a key={i} href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 rounded-xl bg-[#202c33] hover:bg-[#2a3942] transition">
                                  <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-teal-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-teal-400 truncate">{loc.name || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</p>
                                    <p className="text-[11px] text-[#8696a0]">{loc.sender || 'Anggota'}</p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Empty state */}
                        {sharedMedia.images.length === 0 && sharedMedia.videos.length === 0 && sharedMedia.docs.length === 0 && sharedMedia.links.length === 0 && sharedMedia.locs.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center mb-3">
                              <Image className="w-8 h-8 text-[#8696a0]" />
                            </div>
                            <p className="text-[14px] text-[#8696a0]">Belum ada media</p>
                            <p className="text-[12px] text-[#8696a0]/70 mt-1">Media yang dikirim di grup akan muncul di sini</p>
                          </div>
                        )}
                      </div>

                      {/* Download All */}
                      {(sharedMedia.images.length + sharedMedia.videos.length + sharedMedia.docs.length > 0) && (
                        <div className="px-4 py-3 border-t border-[#222d34] shrink-0">
                          <button onClick={downloadAllMedia}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] text-[13px] font-medium transition">
                            <Download className="w-4 h-4" /> Unduh semua media
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* === TAB: MEMBERS === */}
                  {groupInfoTab === 'members' && (
                    <>
                      {/* Search + Invite */}
                      <div className="px-3 py-2 border-b border-[#222d34]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
                          <input placeholder="Cari anggota..."
                            className="w-full bg-[#202c33] rounded-lg pl-9 pr-4 py-2 text-[13px] text-[#e9edef] placeholder:text-[#8696a0] outline-none" />
                        </div>
                      </div>

                      {/* Invite button */}
                      {amIAdmin() && (
                        <div className="px-4 py-3 border-b border-[#222d34]">
                          <button onClick={() => setShowInviteModal(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-[13px] font-bold transition">
                            <UserPlus className="w-4 h-4" /> Undang anggota baru
                          </button>
                        </div>
                      )}

                      {/* Owner */}
                      {members.filter(m => m.role === 'owner').length > 0 && (
                        <div className="px-4 py-2 border-b border-[#222d34]">
                          <p className="text-[12px] font-semibold text-[#8696a0] mb-1">Pemilik Grup</p>
                          {members.filter(m => m.role === 'owner').map(m => {
                            const uid = m.userId || m.id
                            const display = m.displayName || m.username || 'Anggota'
                            return (
                              <div key={String(uid)} className="flex items-center gap-3 py-2">
                                <Avatar name={display} color={m.avatarColor || 'from-teal-500 via-emerald-500 to-green-500'} size={42} online={onlineUsers.has(String(uid))} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14.5px] text-[#e9edef] truncate flex items-center gap-1.5">
                                    {display} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  </p>
                                  <p className="text-[12px] text-[#8696a0]">@{m.username || 'user'}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Admins */}
                      {members.filter(m => m.role === 'admin').length > 0 && (
                        <div className="px-4 py-2 border-b border-[#222d34]">
                          <p className="text-[12px] font-semibold text-[#8696a0] mb-1">Admin · {members.filter(m => m.role === 'admin').length}</p>
                          {members.filter(m => m.role === 'admin').map(m => {
                            const uid = m.userId || m.id
                            const display = m.displayName || m.username || 'Anggota'
                            return (
                              <div key={String(uid)} className="flex items-center gap-3 py-2">
                                <Avatar name={display} color={m.avatarColor || 'from-teal-500 via-emerald-500 to-green-500'} size={42} online={onlineUsers.has(String(uid))} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14.5px] text-[#e9edef] truncate flex items-center gap-1.5">
                                    {display} <Shield className="w-3 h-3 text-[#00a884]" />
                                  </p>
                                  <p className="text-[12px] text-[#8696a0]">@{m.username || 'user'}</p>
                                </div>
                                {amIAdmin() && String(currentUser?.id) !== String(uid) && (
                                  <button onClick={() => kickMember(uid)} title="Keluarkan"
                                    className="w-8 h-8 rounded-full text-red-400 hover:bg-red-500/10 flex items-center justify-center opacity-60 hover:opacity-100">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Members */}
                      <div className="px-4 py-2">
                        <p className="text-[12px] font-semibold text-[#8696a0] mb-1">Anggota · {members.filter(m => !m.role || m.role === 'member').length}</p>
                        <ul className="space-y-0.5">
                          {members.filter(m => !m.role || m.role === 'member').map(m => {
                            const uid = m.userId || m.id
                            const display = m.displayName || m.username || 'Anggota'
                            return (
                              <li key={String(uid)}>
                                <div className="flex items-center gap-3 py-2 rounded-lg hover:bg-[#202c33] px-2 -mx-2 transition">
                                  <Avatar name={display} color={m.avatarColor || 'from-teal-500 via-emerald-500 to-green-500'} size={42} online={onlineUsers.has(String(uid))} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14.5px] text-[#e9edef] truncate">{display}</p>
                                    <p className="text-[12px] text-[#8696a0]">@{m.username || 'user'}</p>
                                  </div>
                                  {amIAdmin() && (
                                    <button onClick={() => kickMember(uid)} title="Keluarkan"
                                      className="w-8 h-8 rounded-full text-red-400 hover:bg-red-500/10 flex items-center justify-center opacity-60 hover:opacity-100">
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </>
                  )}
                </aside>
              )}

            </div>

            {/* Poll Modal */}
            {showPollModal && (
              <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPollModal(false)}>
                <div className="w-full max-w-md rounded-2xl bg-[#202c33] border border-[#2a3942] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-[#2a3942] flex items-center justify-between">
                    <h3 className="font-bold text-[17px] text-[#e9edef] flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#00a884]" /> Buat Polling
                    </h3>
                    <button onClick={() => setShowPollModal(false)} className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="text-[12px] font-semibold text-[#8696a0] mb-1.5 block">Pertanyaan</label>
                      <input
                        value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Apa yang ingin kamu tanyakan?"
                        className="w-full bg-[#2a3942] rounded-lg px-4 py-2.5 text-sm text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent focus:border-[#00a884]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold text-[#8696a0] block">Pilihan (min 2)</label>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center text-[11px] font-bold text-[#00a884]">{i + 1}</div>
                          <input
                            value={opt} onChange={(e) => setPollOptions(pollOptions.map((o, idx) => idx === i ? e.target.value : o))}
                            placeholder={`Pilihan ${i + 1}`}
                            className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 text-sm text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent focus:border-[#00a884]"
                          />
                          <button onClick={() => removePollOption(i)} disabled={pollOptions.length <= 2}
                            className="w-8 h-8 rounded-md hover:bg-red-500/10 text-red-400 disabled:opacity-30 flex items-center justify-center">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={addPollOption} disabled={pollOptions.length >= 10}
                        className="w-full py-2 rounded-lg border border-dashed border-[#2a3942] hover:border-[#00a884] text-[12px] text-[#8696a0] hover:text-[#00a884] transition font-semibold disabled:opacity-40">
                        + Tambah pilihan ({pollOptions.length}/10)
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-[#2a3942] flex justify-end gap-2 bg-[#111b21]">
                    <button onClick={() => setShowPollModal(false)} className="px-5 py-2 rounded-lg text-[13px] font-bold text-[#00a884] hover:bg-[#00a884]/10">Batal</button>
                    <button onClick={createPoll} disabled={uploading}
                      className="px-5 py-2 rounded-lg bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-[13px] font-bold disabled:opacity-60 flex items-center gap-2">
                      {uploading && <div className="w-3.5 h-3.5 rounded-full border-2 border-[#111b21]/60 border-t-[#111b21] animate-spin" />}
                      Buat Polling
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Group Modal */}
            {showEditGroup && (
              <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowEditGroup(false)}>
                <form onSubmit={saveGroupDetails} className="w-full max-w-md rounded-2xl bg-[#202c33] border border-[#2a3942] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-[#2a3942] flex items-center justify-between">
                    <h3 className="font-bold text-[17px] text-[#e9edef] flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-[#00a884]" /> Edit Info Grup
                    </h3>
                    <button type="button" onClick={() => setShowEditGroup(false)} className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="text-[12px] font-semibold text-[#8696a0] mb-1.5 block">Nama grup</label>
                      <input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} required
                        placeholder="Masukkan nama grup"
                        className="w-full bg-[#2a3942] rounded-lg px-4 py-2.5 text-sm text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent focus:border-[#00a884]" />
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-[#8696a0] mb-1.5 block">Deskripsi grup</label>
                      <textarea value={editGroupDescription} onChange={(e) => setEditGroupDescription(e.target.value)} rows={3}
                        placeholder="Tentang grup ini..."
                        className="w-full bg-[#2a3942] rounded-lg px-4 py-2.5 text-sm text-[#e9edef] placeholder:text-[#8696a0] outline-none border border-transparent focus:border-[#00a884] resize-none" />
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-[#2a3942] flex justify-end gap-2 bg-[#111b21]">
                    <button type="button" onClick={() => setShowEditGroup(false)} className="px-5 py-2 rounded-lg text-[13px] font-bold text-[#00a884] hover:bg-[#00a884]/10">Batal</button>
                    <button type="submit" disabled={savingGroup || !editGroupName.trim()}
                      className="px-5 py-2 rounded-lg bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] text-[13px] font-bold disabled:opacity-60 flex items-center gap-2">
                      {savingGroup && <div className="w-3.5 h-3.5 rounded-full border-2 border-[#111b21]/60 border-t-[#111b21] animate-spin" />}
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ======= INVITE MEMBERS MODAL — WhatsApp Style ======= */}
            {showInviteModal && (
              <div className="absolute inset-0 z-30 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setShowInviteModal(false); setSelectedInvitees([]); setInviteSearch(''); setInviteResults([]) }}>
                <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#111b21] border border-[#222d34] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="h-[60px] px-4 flex items-center justify-between bg-[#202c33] shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setShowInviteModal(false); setSelectedInvitees([]); setInviteSearch(''); setInviteResults([]) }} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aebac1]">
                        <X className="w-5 h-5" />
                      </button>
                      <h3 className="font-semibold text-[16px] text-[#e9edef]">Undang Anggota</h3>
                    </div>
                    {selectedInvitees.length > 0 && (
                      <button onClick={inviteMembers} className="text-[14px] font-bold text-[#00a884] hover:text-[#06cf9c] transition">
                        Kirim ({selectedInvitees.length})
                      </button>
                    )}
                  </div>

                  {/* Selected chips */}
                  {selectedInvitees.length > 0 && (
                    <div className="px-4 py-2 bg-[#202c33] flex gap-2 overflow-x-auto no-scrollbar border-b border-[#222d34]">
                      {selectedInvitees.map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00a884]/15 border border-[#00a884]/30 shrink-0">
                          <span className="text-[12px] text-[#00a884] font-medium truncate max-w-[100px]">{u.displayName || u.username}</span>
                          <button onClick={() => toggleInvitee(u)} className="w-4 h-4 rounded-full bg-[#00a884]/30 flex items-center justify-center">
                            <X className="w-3 h-3 text-[#00a884]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div className="px-4 py-2.5 border-b border-[#222d34]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
                      <input value={inviteSearch}
                        onChange={(e) => { setInviteSearch(e.target.value); searchInviteUsers(e.target.value) }}
                        placeholder="Cari nama atau username..."
                        className="w-full bg-[#202c33] rounded-lg pl-9 pr-4 py-2.5 text-[14px] text-[#e9edef] placeholder:text-[#8696a0] outline-none" />
                      {inviteLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#8696a0] border-t-transparent animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto">
                    {inviteResults.length > 0 ? (
                      <ul>
                        {inviteResults.map(u => {
                          const selected = selectedInvitees.some(s => s.id === u.id)
                          return (
                            <li key={u.id}>
                              <button onClick={() => toggleInvitee(u)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] transition text-left">
                                <Avatar name={u.displayName || u.username} color={u.avatarColor || 'from-teal-500 via-emerald-500 to-green-500'} size={44} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14.5px] text-[#e9edef] truncate font-medium">{u.displayName || u.username}</p>
                                  <p className="text-[12px] text-[#8696a0]">@{u.username || 'user'}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                                  selected ? 'bg-[#00a884] border-[#00a884]' : 'border-[#8696a0]'
                                }`}>
                                  {selected && <Check className="w-3.5 h-3.5 text-[#111b21]" />}
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-6">
                        <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center mb-3">
                          <UserPlus className="w-8 h-8 text-[#8696a0]" />
                        </div>
                        <p className="text-[14px] text-[#8696a0] text-center">
                          {inviteSearch.length >= 2 ? 'Tidak ada pengguna ditemukan' : 'Ketik nama untuk mencari pengguna'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ======= ACTIVE GROUP CALL OVERLAY ======= */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-[#071016] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <button
              onClick={() => !window.confirm('Akhiri panggilan dan kembali?') || endCall()}
              className="mb-4 inline-flex items-center gap-2 text-[#8696a0] hover:text-white text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali (akhiri panggilan)
            </button>
            <div
              className="rounded-3xl border border-[#222d34] overflow-hidden shadow-2xl"
              style={{
                background: activeCall.type === 'video'
                  ? 'radial-gradient(ellipse at top, rgba(0,168,132,0.1), transparent 60%), #05060a'
                  : 'radial-gradient(ellipse at center, rgba(0,168,132,0.08), transparent 70%), #071016',
              }}
            >
              <div className="px-6 pt-6 pb-3 flex items-start justify-between">
                <div>
                  <p className="text-xs text-[#8696a0] uppercase tracking-wider font-bold mb-1">
                    {activeCall.type === 'voice' ? 'Panggilan Suara Grup' : activeCall.type === 'video' ? 'Panggilan Video Grup' : 'Group Call'}
                  </p>
                  <p className="text-lg font-bold text-[#e9edef]">{activeCall.groupName}</p>
                  <p className="text-[12px] text-[#8696a0] mt-0.5">
                    {activeCall.status === 'calling' ? 'Menghubungkan anggota...' : 'Terhubung'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold uppercase text-emerald-300">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeCall.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400 animate-ping'}`} />
                    {activeCall.status === 'calling' ? 'Memanggil' : 'Terhubung'}
                  </span>
                </div>
              </div>

              <div className="px-6 pb-4">
                {(activeCall.type === 'video') ? (
                  <div className="aspect-video rounded-2xl bg-black border border-white/5 flex items-center justify-center mb-5 overflow-hidden relative">
                    <video ref={peerVideoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover absolute inset-0" />
                    <div className="absolute bottom-3 right-3 w-40 h-28 rounded-xl border-2 border-white/15 overflow-hidden shadow-2xl bg-black">
                      <video ref={selfVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    </div>
                    {!localStreamRef.current && (
                      <div className="relative text-center py-8">
                        <Avatar name={activeCall.groupName || 'Call'} color="from-teal-500 via-emerald-500 to-green-500" size={110} ring />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-14 flex flex-col items-center">
                    <div className="relative mb-6">
                      <Avatar name={activeCall.groupName || 'Call'} color="from-teal-500 via-emerald-500 to-green-500" size={156} ring />
                      <span className="absolute inset-0 rounded-full border-4 border-[#00a884]/20 animate-ping" />
                    </div>
                    <h2 className="text-3xl font-bold mb-1 text-[#e9edef]">{activeCall.groupName}</h2>
                    <p className="text-[#8696a0] text-sm">{activeCall.status === 'calling' ? 'Sedang memanggil grup...' : 'Panggilan suara aktif'}</p>
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#202c33] border border-[#2a3942]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-pulse" />
                  <span className="font-mono text-lg font-bold tracking-wider tabular-nums text-[#e9edef]">
                    {activeCall.status === 'calling' ? 'Memanggil...' : formatDuration(callElapsed)}
                  </span>
                </div>
              </div>

              <div className="px-6 pb-10 pt-2">
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                  <button onClick={() => {
                    const next = !callMicOn; setCallMicOn(next)
                    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next })
                  }}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition border-2 ${
                      callMicOn ? 'bg-[#233138] border-[#2a3942] text-white hover:bg-[#2a3942]' : 'bg-red-500 border-red-500/50 text-white shadow-lg shadow-red-500/30'
                    }`}
                    title={callMicOn ? 'Matikan mic' : 'Nyalakan mic'}
                  >
                    {callMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </button>
                  {activeCall.type === 'video' && (
                    <button onClick={() => {
                      const next = !callCamOn; setCallCamOn(next)
                      if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = next })
                    }}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition border-2 ${
                        callCamOn ? 'bg-[#233138] border-[#2a3942] text-white hover:bg-[#2a3942]' : 'bg-red-500 border-red-500/50 text-white shadow-lg shadow-red-500/30'
                      }`}
                      title={callCamOn ? 'Matikan kamera' : 'Nyalakan kamera'}
                    >
                      {callCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    </button>
                  )}
                  <button onClick={endCall}
                    className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-full bg-[#ef4444] hover:bg-red-400 text-white flex items-center justify-center transition shadow-2xl shadow-red-500/40 scale-105 hover:scale-110"
                    title="Akhiri panggilan"
                  >
                    <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 rotate-[135deg]" />
                  </button>
                  <button onClick={() => setShowGroupInfo(v => !v)}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#233138] border-[#2a3942] text-white hover:bg-[#2a3942] flex items-center justify-center transition border-2"
                    title="Info grup"
                  >
                    <UserCog className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupChat
