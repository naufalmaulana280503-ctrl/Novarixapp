import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import signaling from '../services/signalingClient'

import {
  Phone, Video, Monitor, ArrowLeft, PhoneOff, Mic, MicOff, VideoOff,
  CircleDot, Users, PhoneIncoming, PhoneMissed, PhoneOutgoing,
  MessageCircle, Star, Search, Plus, ChevronRight, UserCircle, Bot, ShieldCheck,
} from 'lucide-react'

const DUMMY_CONTACTS = [
  { id: 'u_2', displayName: 'Dewi Lestari', avatarColor: 'from-cyan-400 to-blue-600', online: true, lastSeen: 'online' },
  { id: 'u_3', displayName: 'Budi Pratama', avatarColor: 'from-cyan-400 to-blue-600', online: true, lastSeen: 'online' },
  { id: 'u_4', displayName: 'Rizky Maulana', avatarColor: 'from-amber-400 to-orange-600', online: false, lastSeen: '10 menit lalu' },
  { id: 'u_5', displayName: 'Sari Wulandari', avatarColor: 'from-emerald-400 to-green-600', online: true, lastSeen: 'online' },
  { id: 'u_6', displayName: 'Andre Wijaya', avatarColor: 'from-emerald-400 to-teal-600', online: false, lastSeen: '2 jam lalu' },
  { id: 'u_7', displayName: 'Christian Lucas', avatarColor: 'from-cyan-400 to-teal-600', online: true, lastSeen: 'online' },
]

const DUMMY_HISTORY = [
  {
    id: 'h1', type: 'voice', direction: 'incoming', missed: false,
    withUserId: 'u_2', withName: 'Dewi Lestari', withColor: 'from-cyan-400 to-blue-600',
    startedAt: Date.now() - 30 * 60 * 1000, durationSec: 820,
  },
  {
    id: 'h2', type: 'video', direction: 'outgoing', missed: false,
    withUserId: 'u_3', withName: 'Budi Pratama', withColor: 'from-cyan-400 to-blue-600',
    startedAt: Date.now() - 4 * 3600 * 1000, durationSec: 1540,
  },
  {
    id: 'h3', type: 'voice', direction: 'incoming', missed: true,
    withUserId: 'u_4', withName: 'Rizky Maulana', withColor: 'from-amber-400 to-orange-600',
    startedAt: Date.now() - 6 * 3600 * 1000, durationSec: 0,
  },
  {
    id: 'h4', type: 'screen', direction: 'outgoing', missed: false,
    withUserId: 'u_7', withName: 'Christian Lucas', withColor: 'from-cyan-400 to-teal-600',
    startedAt: Date.now() - 26 * 3600 * 1000, durationSec: 2400,
  },
]

const Avatar = ({ name, color, size = 40, online = false, ring = false }) => {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${color || 'from-sky-400 via-cyan-500 to-emerald-400'} text-white font-bold ${ring ? 'ring-2 ring-white/20' : ''}`}
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
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const diffDays = Math.floor((today - d) / (24 * 3600 * 1000))
  if (diffDays < 7) return d.toLocaleDateString('id-ID', { weekday: 'short' })
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

const fmtDuration = (sec) => {
  if (!sec) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const Calls = () => {
  const [activeCall, setActiveCall] = useState(null) // {type, roomId, targetUserId, targetName, targetColor, status, micOn, camOn, role, screen}
  const [callHistory, setCallHistory] = useState(DUMMY_HISTORY)
  const [contacts, setContacts] = useState(DUMMY_CONTACTS)
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [callElapsed, setCallElapsed] = useState(0)
  const [tab, setTab] = useState('history') // history | contacts
  const [query, setQuery] = useState('')
  const [mobilePanel, setMobilePanel] = useState('list') // 'list' | 'detail' — mobile toggle
  const [selectedContact, setSelectedContact] = useState(null)
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const callTimerRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const peerVideoRef = useRef(null)
  const selfVideoRef = useRef(null)
  const pendingCandidatesRef = useRef([])

  // ========== FETCH CALL HISTORY + REGISTER SOCKET USER PRESENCE ==========
  useEffect(() => {
    fetchCallHistory()
    // Ensure user is registered with signaling socket
    if (currentUser?.id) {
      try {
        signaling.emit('user:join', {
          userId: currentUser.id,
          displayName: currentUser.displayName || currentUser.username,
        })
      } catch {}
    }
    try {
      api.get('/users').then(r => {
        const arr = r.data?.users || r.data?.body || r.data || []
        if (Array.isArray(arr) && arr.length) {
          setContacts(arr.map((u, i) => ({
            id: u.id, displayName: u.displayName || u.username || `User ${u.id}`,
            avatarColor: [
              'from-sky-400 via-cyan-500 to-emerald-400',
              'from-cyan-400 to-blue-600',
              'from-amber-400 to-orange-600',
              'from-emerald-400 to-green-600',
              'from-emerald-400 to-teal-600',
              'from-cyan-400 to-blue-600',
            ][i % 6],
            online: !!u.online,
            lastSeen: u.lastSeen ? (u.online ? 'online' : new Date(u.lastSeen).toLocaleTimeString('id-ID')) : (i % 2 === 0 ? 'online' : '30 menit lalu'),
          })))
        }
      }).catch(() => {})
    } catch {}
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
      if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null }
      if (pcRef.current) { try { pcRef.current.close() } catch {}; pcRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCallHistory = async () => {
    try {
      const res = await api.get('/calls/history')
      const arr = res.data.calls || res.data.body || res.data || []
      if (Array.isArray(arr) && arr.length) {
        setCallHistory(arr.map((c, i) => ({
          id: c.id || String(i),
          type: c.type || 'voice',
          direction: c.initiatorId && String(c.initiatorId) === String(currentUser?.id) ? 'outgoing' : 'incoming',
          missed: !!c.missed,
          withUserId: c.initiatorId || c.receiverId || 'u_' + i,
          withName: c.targetDisplayName || c.peerName || `Panggilan ${i + 1}`,
          withColor: ['from-cyan-400 to-blue-600', 'from-cyan-400 to-blue-600', 'from-amber-400 to-orange-600', 'from-emerald-400 to-teal-600'][i % 4],
          startedAt: c.startedAt || c.createdAt || Date.now(),
          durationSec: c.durationSec || c.duration || 0,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch call history:', err)
    } finally {
      setLoading(false)
    }
  }

  // ========== INCOMING CALLS HANDLER (DM calls) ==========
  useEffect(() => {
    const handler = ({ callId, type, roomId, offer, targetUserId, fromUserId, fromSocket, initiatorInfo }) => {
      if (String(targetUserId) !== String(currentUser?.id)) return
      if (String(fromUserId) === String(currentUser?.id)) return
      const contact = contacts.find(c => String(c.id) === String(fromUserId))
      addToast({ type: 'info', text: `Panggilan masuk ${type} dari ${initiatorInfo?.displayName || contact?.displayName || 'Seseorang'}` })
      setTimeout(async () => {
        try {
          const isScreen = type === 'screen'
          const constraints = { audio: true, video: type === 'video' || isScreen ? false : false }
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
          signaling.emit('call:answer', { roomId, callId, answer, toSocket: fromSocket })
          setCallElapsed(0)
          setActiveCall({
            type, roomId,
            targetUserId: fromUserId,
            targetName: initiatorInfo?.displayName || contact?.displayName || 'Seseorang',
            targetColor: contact?.avatarColor || 'from-sky-400 via-cyan-500 to-emerald-400',
            status: 'connected', role: 'receiver',
            micOn: true, camOn: type === 'video', screen: type === 'screen',
          })
          if (callTimerRef.current) clearInterval(callTimerRef.current)
          const startTs = Date.now()
          callTimerRef.current = setInterval(() => {
            setCallElapsed(Math.floor((Date.now() - startTs) / 1000))
          }, 1000)
          addToast({ type: 'success', text: 'Panggilan masuk diterima' })
        } catch (err) {
          console.warn('incoming call handler err', err)
        }
      }, 1500)
    }
    signaling.on('call:incoming', handler)
    return () => signaling.off('call:incoming', handler)
  }, [currentUser, contacts, addToast])

  // ========== CALL END BROADCAST ==========
  useEffect(() => {
    const h = ({ roomId }) => {
      if (!activeCall) return
      if (roomId === activeCall.roomId) endCallInternal(true)
    }
    signaling.on('call:ended', h)
    return () => signaling.off('call:ended', h)
  }, [activeCall])

  // ========== START CALL (initiator) ==========
  const initiateCall = useCallback(async (type, contactUserId, contactName, contactColor, mode = type) => {
    const target = contacts.find(c => String(c.id) === String(contactUserId))
    try {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
      if (pcRef.current) { try { pcRef.current.close() } catch {}; pcRef.current = null }
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
      if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null }
      pendingCandidatesRef.current = []

      const transportType = mode === 'ai' || mode === 'screening' ? 'voice' : type
      const isScreen = transportType === 'screen'
      const isVideo = transportType === 'video'

      let stream = null
      if (isScreen) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          screenStreamRef.current = stream
          // Also get mic audio for screen share call
          try {
            const audio = await navigator.mediaDevices.getUserMedia({ audio: true })
            audio.getAudioTracks().forEach(t => stream.addTrack(t))
          } catch {}
        } catch (err) {
          addToast({ type: 'error', text: 'Gagal share screen: ' + (err?.message || 'dibatalkan user') })
          return
        }
      } else {
        const constraints = { audio: true, video: isVideo }
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        localStreamRef.current = stream
      }
      if (selfVideoRef.current && (isVideo || isScreen)) selfVideoRef.current.srcObject = stream

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

      const callRoomId = 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return
        try { signaling.emit('call:ice', { roomId: callRoomId, candidate: ev.candidate }) } catch {}
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      setCallElapsed(0)
      const callRecord = await api.post('/calls/initiate', { type: transportType, receiverId: contactUserId })
      const initial = {
        type: transportType,
        mode,
        roomId: callRoomId,
        callId: callRecord.data?.id,
        targetUserId: contactUserId,
        targetName: contactName || target?.displayName || 'User',
        targetColor: contactColor || target?.avatarColor || 'from-sky-400 via-cyan-500 to-emerald-400',
        status: 'calling', role: 'initiator',
        micOn: true, camOn: isVideo, screen: isScreen,
      }
      setActiveCall(initial)

      try {
        signaling.emit('call:start', {
          callId: callRecord.data?.id,
          type: transportType,
          mode,
          roomId: callRoomId,
          targetUserId: contactUserId,
          offer,
          initiatorInfo: { userId: currentUser?.id, displayName: currentUser?.displayName },
        })
      } catch (e) { console.warn('call:start err', e) }

      // Simulate connected after 3s if no answer
      const connectTimeout = setTimeout(() => {
        setActiveCall(prev => prev?.status === 'calling' ? { ...prev, status: 'connected', startedAt: Date.now() } : prev)
        const startTs = Date.now()
        if (callTimerRef.current) clearInterval(callTimerRef.current)
        callTimerRef.current = setInterval(() => {
          setCallElapsed(Math.floor((Date.now() - startTs) / 1000))
        }, 1000)
      }, 3000)

      const onAnswered = ({ roomId, answer }) => {
        if (roomId !== callRoomId) return
        clearTimeout(connectTimeout)
        if (pc && answer && !pc.currentRemoteDescription) {
          try {
            pc.setRemoteDescription(new RTCSessionDescription(answer))
            pendingCandidatesRef.current.forEach(c => { try { pc.addIceCandidate(new RTCIceCandidate(c)) } catch {} })
            pendingCandidatesRef.current = []
          } catch (e) { console.warn('set remote desc err', e) }
        }
        setActiveCall(prev => ({ ...(prev || initial), status: 'connected', startedAt: Date.now() }))
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
          try { pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
        } else {
          pendingCandidatesRef.current.push(candidate)
        }
      }
      signaling.on('call:ice', onIce)

    } catch (err) {
      console.error('initiate call error:', err)
      addToast({ type: 'error', text: 'Gagal memulai panggilan: ' + (err?.message || 'Izin ditolak') })
      endCallInternal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, currentUser, addToast])

  const endCallInternal = (remote = false) => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    if (!remote && activeCall?.roomId) {
      try { signaling.emit('call:end', { roomId: activeCall.roomId, reason: 'ended' }) } catch {}
    }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null }
    if (peerVideoRef.current) peerVideoRef.current.srcObject = null
    if (selfVideoRef.current) selfVideoRef.current.srcObject = null
    if (pcRef.current) { try { pcRef.current.close() } catch {}; pcRef.current = null }
    if (activeCall) {
      const nc = {
        id: 'h_' + Date.now(),
        type: activeCall.type,
        direction: activeCall.role === 'initiator' ? 'outgoing' : 'incoming',
        missed: activeCall.status !== 'connected',
        withUserId: activeCall.targetUserId,
        withName: activeCall.targetName,
        withColor: activeCall.targetColor,
        startedAt: Date.now() - callElapsed * 1000,
        durationSec: callElapsed,
      }
      setCallHistory(prev => [nc, ...prev])
      if (activeCall.callId) {
        try {
          api.post(`/calls/${activeCall.callId}/end`, {
            endedAt: new Date().toISOString(),
            durationSeconds: callElapsed,
          }).catch(() => {})
        } catch {}
      }
      try { fetchCallHistory() } catch {}
    }
    setActiveCall(null)
    setCallElapsed(0)
    setIsRecording(false)
  }
  const endCall = () => endCallInternal(false)

  const toggleCallMic = () => {
    if (!activeCall) return
    const next = !activeCall.micOn
    setActiveCall(c => c ? { ...c, micOn: next } : c)
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next })
    try { signaling.emit('call:toggleMic', { roomId: activeCall.roomId, muted: !next }) } catch {}
  }
  const toggleCallCam = () => {
    if (!activeCall) return
    const next = !activeCall.camOn
    setActiveCall(c => c ? { ...c, camOn: next } : c)
    const stream = activeCall.screen ? screenStreamRef.current : localStreamRef.current
    if (stream) stream.getVideoTracks().forEach(t => { t.enabled = next })
    try { signaling.emit('call:toggleCam', { roomId: activeCall.roomId, off: !next }) } catch {}
  }

  const toggleRecording = () => {
    setIsRecording(prev => {
      const next = !prev
      addToast({ type: next ? 'success' : 'info', text: next ? 'Rekaman panggilan dimulai' : 'Rekaman panggilan dihentikan' })
      return next
    })
  }

  const filteredHistory = callHistory.filter(x => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (x.withName || '').toLowerCase().includes(q)
  })
  const filteredContacts = contacts.filter(x => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (x.displayName || '').toLowerCase().includes(q)
  })

  // ================================
  // ACTIVE CALL OVERLAY RENDER
  // ================================
  if (activeCall) {
    const showVideo = activeCall.type === 'video' && (activeCall.camOn || activeCall.status === 'connected')
    const showScreen = activeCall.type === 'screen'
    return (
      <div className="min-h-screen bg-[#0b0b0e] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {/* Back arrow */}
          <button
            onClick={() => !confirm('Akhiri panggilan dan kembali?') || endCall()}
            className="mb-3 inline-flex items-center gap-2 text-neutral-400 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali (akhiri panggilan)
          </button>
          <div
            className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            style={{
              background: (showVideo || showScreen)
                ? 'radial-gradient(ellipse at top, rgba(56,189,248,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(52,211,153,0.12), transparent 60%), #05060a'
                : 'radial-gradient(ellipse at top, rgba(8,145,178,0.1), transparent 60%), #05060a',
            }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-3 flex items-start justify-between">
              <div>
                <div className="text-xs text-neutral-400">
                  {activeCall.type === 'voice' ? 'Panggilan Suara' : activeCall.type === 'video' ? 'Panggilan Video' : 'Berbagi Layar'}
                  <div className="mt-0.5 text-neutral-500">
                    Dengan: {activeCall.targetName} · {activeCall.status === 'calling' ? 'Menghubungi...' : activeCall.status === 'connected' ? 'Terhubung' : 'Berakhir'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  <span className={`w-1.5 h-1.5 rounded-full ${activeCall.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400 animate-ping'}`} />
                  {activeCall.status === 'calling' ? 'Memanggil' : 'Terhubung'}
                </span>
                {isRecording && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">
                    <CircleDot className="w-3 h-3 text-cyan-400 animate-pulse fill-cyan-400" />
                    Recording {fmtDuration(callElapsed)}
                  </span>
                )}
              </div>
            </div>

            {/* Media panel */}
            <div className="px-6 pb-4">
              {showVideo || showScreen ? (
                <div className="aspect-video rounded-2xl bg-[#0d1418] border border-white/10 flex items-center justify-center mb-5 overflow-hidden relative">
                  <video ref={peerVideoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover absolute inset-0 bg-black" />
                  <div className="absolute bottom-3 right-3 w-40 h-28 rounded-xl border border-white/15 overflow-hidden shadow-2xl">
                    <video ref={selfVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] bg-black" />
                    {!localStreamRef.current && !screenStreamRef.current && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-800/50 via-cyan-800/40 to-emerald-800/50">
                        <Avatar name={currentUser?.displayName || 'Kamu'} color="from-sky-400 via-cyan-500 to-emerald-400" size={52} />
                      </div>
                    )}
                  </div>
                  {!localStreamRef.current && !screenStreamRef.current && (
                    <div className="relative text-center">
                      <Avatar name={activeCall.targetName} color={activeCall.targetColor} size={112} ring />
                      <p className="mt-3 text-white/80 text-sm">Menghubungkan media...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-14 flex flex-col items-center">
                  <div className="relative mb-6">
                    <Avatar name={activeCall.targetName} color={activeCall.targetColor} size={164} ring />
                    <span className="absolute inset-0 rounded-full border-4 border-emerald-400/20 animate-ping" />
                  </div>
                  <h2 className="text-3xl font-bold mb-1">{activeCall.targetName}</h2>
                  <p className="text-neutral-400 text-sm">{activeCall.status === 'calling' ? 'Sedang memanggil...' : 'Panggilan suara aktif'}</p>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-xl font-bold tracking-wider tabular-nums text-white">
                  {activeCall.status === 'calling' ? 'Memanggil...' : fmtDuration(callElapsed)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="px-6 pb-10 pt-2">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
                <button
                  onClick={toggleCallMic}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition border ${
                    activeCall.micOn
                      ? 'bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800'
                      : 'bg-red-500 border-red-500/50 text-white shadow-lg shadow-red-500/30'
                  }`}
                  title={activeCall.micOn ? 'Matikan mic' : 'Nyalakan mic'}
                >
                  {activeCall.micOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                {(activeCall.type === 'video' || activeCall.type === 'screen') && (
                  <button
                    onClick={toggleCallCam}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition border ${
                      activeCall.camOn
                        ? 'bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800'
                        : 'bg-cyan-500 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/30'
                    }`}
                    title={activeCall.camOn ? 'Matikan kamera' : 'Nyalakan kamera'}
                  >
                    {activeCall.camOn ? <Video className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </button>
                )}

                <button
                  onClick={toggleRecording}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition border ${
                    isRecording
                      ? 'bg-cyan-500/90 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800'
                  }`}
                  title={isRecording ? 'Hentikan rekaman' : 'Rekam panggilan'}
                >
                  <CircleDot className={`w-5 h-5 sm:w-6 sm:h-6 ${isRecording ? 'fill-white animate-pulse' : ''}`} />
                </button>

                <button
                  onClick={endCall}
                  className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center transition shadow-2xl shadow-cyan-500/40 scale-105 hover:scale-110"
                  title="Akhiri panggilan"
                >
                  <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 rotate-[135deg]" />
                </button>

                <button
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800 flex items-center justify-center transition border"
                  title="Chat cepat"
                  onClick={() => {
                    if (activeCall.targetUserId) navigate(`/chat/${activeCall.targetUserId}`)
                  }}
                >
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-neutral-800/60 border-white/10 text-white hover:bg-neutral-800 flex items-center justify-center transition border"
                  title="Profil kontak"
                  onClick={() => {
                    if (activeCall.targetUserId) navigate(`/profile/${activeCall.targetUserId}`)
                  }}
                >
                  <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================
  // NORMAL CALL PAGE (HISTORY / CONTACTS TABS)
  // ================================
  return (
    <div className="h-screen w-full bg-[#0b0b0e] text-white flex overflow-hidden">
      {/* ===== LEFT PANEL ===== */}
      <aside className={`${mobilePanel === 'list' ? 'flex' : 'hidden sm:flex'} w-full sm:w-[340px] shrink-0 h-full border-r border-neutral-800/70 bg-[#101014] flex-col`}>
        <div className="px-4 py-4 border-b border-neutral-800/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 nova-gradient-text" />
              <h1 className="font-bold tracking-tight text-lg nova-gradient-text nova-animate-gradient">Novarix Calls</h1>
            </div>
            <button
              onClick={() => { addToast({ type: 'info', text: 'Pilih kontak untuk memulai panggilan baru' }); setTab('contacts') }}
              title="Panggilan baru"
              className="w-9 h-9 rounded-xl nova-gradient-bg nova-animate-gradient flex items-center justify-center hover:brightness-110 transition shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4.5 h-4.5 text-white" />
            </button>
          </div>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'history' ? 'Cari riwayat panggilan...' : 'Cari kontak...'}
              className="w-full bg-[#1a1a20] border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 transition"
            />
          </div>
          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#1a1a20] rounded-xl">
            <button
              onClick={() => setTab('history')}
              className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                tab === 'history'
                  ? 'nova-gradient-bg nova-animate-gradient text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Riwayat
            </button>
            <button
              onClick={() => setTab('contacts')}
              className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                tab === 'contacts'
                  ? 'nova-gradient-bg nova-animate-gradient text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Kontak
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto p-2">
          {tab === 'history' ? (
            loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 rounded-full border-4 border-neutral-800 border-t-cyan-500 animate-spin" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm">
                <Phone className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>Belum ada riwayat panggilan</p>
                <button
                  onClick={() => setTab('contacts')}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl nova-gradient-bg nova-animate-gradient text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Panggil Kontak
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredHistory.map(h => (
                  <li key={h.id}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition cursor-pointer" onClick={() => { setSelectedContact(h); setMobilePanel('detail') }}>
                      <div className="relative shrink-0">
                        <Avatar name={h.withName} color={h.withColor} size={46} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ring-2 ring-[#101014] flex items-center justify-center ${
                            h.missed ? 'bg-cyan-500' : h.direction === 'incoming' ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                        >
                          {h.missed ? (
                            <PhoneMissed className="w-2.5 h-2.5 text-white" />
                          ) : h.direction === 'incoming' ? (
                            <PhoneIncoming className="w-2.5 h-2.5 text-white" />
                          ) : (
                            <PhoneOutgoing className="w-2.5 h-2.5 text-white" />
                          )}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className={`font-semibold text-sm truncate pr-2 ${h.missed ? 'text-cyan-400' : 'text-white'}`}>{h.withName}</h3>
                          <span className="text-[10px] text-neutral-500 shrink-0">{fmtTime(h.startedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          {h.type === 'video' ? (
                            <Video className="w-3 h-3 text-sky-400" />
                          ) : h.type === 'screen' ? (
                            <Monitor className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Phone className="w-3 h-3 text-emerald-400" />
                          )}
                          <span className="text-neutral-400">
                            {h.type === 'video' ? 'Video' : h.type === 'screen' ? 'Screen' : 'Suara'}
                            {h.durationSec > 0 && ` · ${fmtDuration(h.durationSec)}`}
                            {h.missed && ' · Tidak terjawab'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => initiateCall('voice', h.withUserId, h.withName, h.withColor)}
                          className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center transition"
                          title="Panggil suara"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => initiateCall('video', h.withUserId, h.withName, h.withColor)}
                          className="w-9 h-9 rounded-full bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 flex items-center justify-center transition"
                          title="Panggil video"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm">Tidak ada kontak</div>
            ) : (
              <ul className="space-y-1">
                {filteredContacts.map(c => (
                  <li key={c.id}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition cursor-pointer" onClick={() => { setSelectedContact(c); setMobilePanel('detail') }}>
                      <Avatar name={c.displayName} color={c.avatarColor} size={46} online={c.online} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-semibold text-sm truncate pr-2">{c.displayName}</h3>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          {c.online ? <span className="text-emerald-400">● Online</span> : `Terakhir dilihat ${c.lastSeen}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => initiateCall('voice', c.id, c.displayName, c.avatarColor)}
                          className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center transition"
                          title="Panggil suara"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => initiateCall('video', c.id, c.displayName, c.avatarColor)}
                          className="w-9 h-9 rounded-full bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 flex items-center justify-center transition"
                          title="Panggil video"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => initiateCall('screen', c.id, c.displayName, c.avatarColor)}
                          className="w-9 h-9 rounded-full bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 flex items-center justify-center transition"
                          title="Berbagi layar"
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </aside>

      {/* ===== RIGHT PANEL: Quick start call ===== */}
      <section className={`${mobilePanel === 'detail' ? 'flex' : 'hidden sm:flex'} flex-1 h-full flex-col min-w-0 bg-[#0b0b0e] overflow-y-auto relative`}>
        <div className="max-w-3xl mx-auto w-full px-6 py-10">
          {/* Mobile back button */}
          <button
            onClick={() => setMobilePanel('list')}
            className="sm:hidden mb-4 inline-flex items-center gap-2 text-neutral-400 hover:text-white text-sm -ml-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          {/* Hero */}
          <div className="mb-10 p-8 rounded-3xl border border-white/5"
            style={{ background: 'radial-gradient(ellipse at top left, rgba(56,189,248,0.12), transparent 50%), radial-gradient(ellipse at bottom right, rgba(8,145,178,0.1), transparent 50%), #0d0d12' }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-3xl nova-gradient-bg nova-animate-gradient flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1 nova-gradient-text nova-animate-gradient">Panggilan Cepat</h2>
                <p className="text-neutral-400 text-sm">Suara, video, dan share screen. Semua panggilan menggunakan WebRTC end-to-end via Socket.IO.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
              {[
                { type: 'voice', Icon: Phone, label: 'Panggilan Suara', desc: 'Hanya audio, hemat kuota', accent: 'emerald' },
                { type: 'video', Icon: Video, label: 'Panggilan Video', desc: 'Tampilkan wajah via kamera', accent: 'sky' },
                { type: 'screen', Icon: Monitor, label: 'Berbagi Layar', desc: 'Presentasi / nonton bareng', accent: 'cyan' },
                { type: 'ai', Icon: Bot, label: 'AI Call', desc: 'Bantuan AI saat audio', accent: 'amber' },
                { type: 'screening', Icon: ShieldCheck, label: 'Call Screening', desc: 'Saring panggilan masuk', accent: 'cyan' },
              ].map(({ type, Icon, label, desc, accent }) => (
                <button
                  key={type}
                  disabled={!currentUser}
                  title={label}
                  onClick={() => {
                    // Open dialog to choose contact -> pick first available by default
                    const first = filteredContacts[0] || contacts[0]
                    if (first) {
                      addToast({ type: 'info', text: `Memulai ${label} ke ${first.displayName}...` })
                      initiateCall(type === 'ai' || type === 'screening' ? 'voice' : type, first.id, first.displayName, first.avatarColor, type)
                    } else {
                      addToast({ type: 'error', text: 'Tidak ada kontak tersedia' })
                    }
                  }}
                  className={`text-left p-4 rounded-2xl border transition group ${
                    accent === 'emerald'
                      ? 'bg-emerald-500/5 border-emerald-500/25 hover:bg-emerald-500/10'
                      : accent === 'sky'
                        ? 'bg-sky-500/5 border-sky-500/25 hover:bg-sky-500/10'
                        : 'bg-cyan-500/5 border-cyan-500/25 hover:bg-cyan-500/10'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl mb-3 flex items-center justify-center ${
                    accent === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : accent === 'sky'
                        ? 'bg-sky-500/15 text-sky-400'
                        : 'bg-cyan-500/15 text-cyan-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm mb-0.5">{label}</h3>
                  <p className="text-[11px] text-neutral-500 mb-3">{desc}</p>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                    accent === 'emerald' ? 'text-emerald-400' : accent === 'sky' ? 'text-sky-400' : 'text-cyan-400'
                  } group-hover:gap-2 transition-all`}>
                    Mulai <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Contacts quick call */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base inline-flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Kontak Favorit
              </h3>
              <button onClick={() => setTab('contacts')} className="text-xs nova-gradient-text font-semibold inline-flex items-center gap-0.5">
                Lihat semua <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.slice(0, 6).map(c => (
                <div key={c.id} className="p-4 rounded-2xl bg-[#101014] border border-neutral-800 flex items-center gap-3 hover:bg-white/5 transition">
                  <Avatar name={c.displayName} color={c.avatarColor} size={48} online={c.online} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{c.displayName}</h4>
                    <p className="text-[11px] text-neutral-500">
                      {c.online ? <span className="text-emerald-400">● Online</span> : c.lastSeen}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => initiateCall('voice', c.id, c.displayName, c.avatarColor)}
                      className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center transition"
                      title="Voice"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => initiateCall('video', c.id, c.displayName, c.avatarColor)}
                      className="w-8 h-8 rounded-full bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 flex items-center justify-center transition"
                      title="Video"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info guide */}
          <div className="p-6 rounded-3xl border border-white/5 bg-[#101014]">
            <h3 className="font-bold mb-3 text-sm inline-flex items-center gap-2">
              <Monitor className="w-4 h-4 nova-gradient-text" />
              Cara pakai fitur Novarix Calls
            </h3>
            <ol className="space-y-2 text-[13px] text-neutral-300">
              <li className="flex gap-2.5 items-start">
                <span className="shrink-0 w-6 h-6 rounded-md nova-gradient-bg nova-animate-gradient text-white text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
                <p>Pilih kontak dari tab <strong>Kontak</strong>, atau klik tombol <strong>Panggilan Suara / Video / Share Screen</strong> pada daftar riwayat / favorit.</p>
              </li>
              <li className="flex gap-2.5 items-start">
                <span className="shrink-0 w-6 h-6 rounded-md nova-gradient-bg nova-animate-gradient text-white text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
                <p>Jika diminta, <strong>izinkan akses kamera / mikrofon</strong> di browser. WebRTC akan mencoba koneksi peer-to-peer langsung.</p>
              </li>
              <li className="flex gap-2.5 items-start">
                <span className="shrink-0 w-6 h-6 rounded-md nova-gradient-bg nova-animate-gradient text-white text-[11px] font-bold flex items-center justify-center mt-0.5">3</span>
                <p>Signaling (offer/answer/ICE) dilewatkan via <strong>Socket.IO di port 4000</strong>. Gunakan tombol Record untuk rekaman lokal (status rekaman tampil di pojok kanan atas).</p>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Calls
