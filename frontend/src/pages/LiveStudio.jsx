import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import LiveControlPanel from '../components/LiveControlPanel'
import CameraSettingsModal from '../components/CameraSettingsModal'
import EffectsLibrary from '../components/EffectsLibrary'
import DonationAlertOverlay from '../components/DonationAlertOverlay'
import MicrophonePanel from '../components/MicrophonePanel'
import LiveChatPanel from '../components/LiveChatPanel'
import signaling from '../services/signalingClient'
import { mixSourcesToCanvasStream } from '../utils/streamUtils'
import { detectMediaDevices, getSourceModes, safeGetUserMedia } from '../utils/deviceUtils'
import { supabase } from '../services/supabase'

/* Lucide */
import {
  Video, Camera, MonitorPlay, RotateCcw, Disc3, Download, Radio, RadioTower,
} from 'lucide-react'

const DEFAULT_STATS = { bitrate: 0, droppedFrames: 0, rtt: 0, durationSeconds: 0 }

/* localStorage key untuk arsip replay */
const REPLAYS_STORAGE_KEY = 'novarix_live_replays'
const loadReplays = () => {
  try {
    const raw = localStorage.getItem(REPLAYS_STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
const saveReplays = (arr) => {
  try { localStorage.setItem(REPLAYS_STORAGE_KEY, JSON.stringify(arr || [])) } catch {}
}

/* Pilih mime type MediaRecorder terbaik */
const pickVideoMime = () => {
  if (typeof window === 'undefined' || !window.MediaRecorder) return ''
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const c of candidates) {
    try { if (MediaRecorder.isTypeSupported(c)) return c } catch {}
  }
  return ''
}

const LiveStudio = ({ streamId, user }) => {
  const [isLive, setIsLive] = useState(false)
  const [liveState, setLiveState] = useState('idle')
  const [showSettings, setShowSettings] = useState(false)
  const [sourceMode, setSourceMode] = useState('front')
  const [selectedEffect, setSelectedEffect] = useState('none')
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [quality, setQuality] = useState('1080p')
  const [networkQuality, setNetworkQuality] = useState('Checking')
  const [viewerCount, setViewerCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [deviceProfile, setDeviceProfile] = useState({
    hasMediaDevices: false, hasFrontCamera: false, hasRearCamera: false,
    hasDualCam: false, canScreenShare: false, videoInputs: [], audioInputs: []
  })
  const [errorMessage, setErrorMessage] = useState('')

  /* ===== Fitur Replay (rekaman live streaming) ===== */
  const [saveReplay, setSaveReplay] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedSizeMB, setRecordedSizeMB] = useState(0)
  const recorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recSizeBytesRef = useRef(0)

  const pcRef = useRef(null)
  const startTsRef = useRef(null)
  const healthIntervalRef = useRef(null)
  const localStreamsRef = useRef([])
  const audioTrackRef = useRef(null)
  const audioDestinationStreamRef = useRef(null)
  const mixedVideoStreamRef = useRef(null)
  const mixedCanvasRef = useRef(null)
  const previewOverlayRef = useRef(null)
  const previewActiveRef = useRef(false)
  const finalStreamRef = useRef(null)

  const sourceModes = getSourceModes(deviceProfile)

  /* ===== Device Detect dengan tambahan canScreenShare ===== */
  useEffect(() => {
    let mounted = true

    const loadDevices = async () => {
      const profile = await detectMediaDevices()
      profile.canScreenShare = !!(
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getDisplayMedia === 'function'
      )
      if (mounted) {
        setDeviceProfile(profile)
        if (!sourceModes.includes(sourceMode)) {
          setSourceMode(profile.hasFrontCamera ? 'front' : (profile.canScreenShare ? 'screen-pip' : 'front'))
        }
      }
    }

    loadDevices()

    return () => {
      mounted = false
      stopBroadcast()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sourceModes.includes(sourceMode)) {
      setSourceMode(sourceModes[0] || 'front')
    }
  }, [sourceModes, sourceMode])

  useEffect(() => {
    if (!isLive) return undefined
    const interval = setInterval(() => {
      if (!isPaused && startTsRef.current) {
        const durationSeconds = Math.floor((Date.now() - startTsRef.current) / 1000)
        setStats((prev) => ({ ...prev, durationSeconds }))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isLive, isPaused])

  useEffect(() => {
    let chan = null
    let mounted = true
    if (!isLive) {
      setViewerCount(0)
      return undefined
    }
    const changeViewersRpc = async (delta) => {
      if (!supabase) return
      try {
        const { data, error } = await supabase.rpc('change_viewers', { stream_id: streamId, delta })
        if (error) throw error
        let newCount = null
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0]
          newCount = typeof first === 'object' ? Object.values(first)[0] : first
        } else if (typeof data === 'number') {
          newCount = data
        } else if (data && typeof data === 'object') {
          newCount = Object.values(data)[0]
        }
        if (newCount != null) setViewerCount(Number(newCount))
      } catch (e) {
        console.warn('changeViewersRpc failed', e)
      }
    }
    ;(async () => {
      await changeViewersRpc(1)
      if (supabase) {
        try {
          await supabase.from('live_stats').upsert({ stream_id: streamId, viewers: 0 })
        } catch (e) { /* ignore */ }
        try {
          chan = supabase.channel(`live_stats_${streamId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_stats', filter: `stream_id=eq.${streamId}` }, (payload) => {
              const row = payload.new || payload.old
              if (!row) return
              if (mounted) setViewerCount(row.viewers || 0)
            })
            .subscribe()
        } catch (e) {
          console.warn('subscribe live_stats failed', e)
        }
      }
    })()
    const sim = setInterval(() => {
      if (!chan) setViewerCount((prev) => prev + (Math.random() > 0.62 ? 1 : 0))
    }, 15000)
    return () => {
      mounted = false
      try { changeViewersRpc(-1) } catch (e) {}
      try { if (chan) supabase.removeChannel(chan) } catch (e) {}
      clearInterval(sim)
    }
  }, [isLive, streamId])

  /* ===== Izin Kamera + Mic ===== */
  const requestCameraMicAccess = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setErrorMessage('Browser ini tidak mendukung kamera & mikrofon.')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setErrorMessage('')
      return true
    } catch (error) {
      const message = error?.name === 'NotAllowedError' || /denied|permission/i.test(String(error?.message || ''))
        ? 'Akses kamera & mikrofon ditolak. Klik “Izinkan Kamera & Mic” lalu pilih Allow.'
        : 'Tidak bisa membuka kamera & mikrofon. Coba lagi.'
      setErrorMessage(message)
      return false
    }
  }

  /* ===== Start Local Sources (Camera depan / belakang / dual / screen share) ===== */
  async function startLocalSources(mode) {
    stopLocalSources()
    const streams = []
    const videoElements = []
    const createVideoEl = (stream) => {
      const video = document.createElement('video')
      video.autoplay = true
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      video.style.display = 'none'
      document.body.appendChild(video)
      return video
    }
    try {
      if (mode === 'front') {
        const stream = await safeGetUserMedia({
          video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        streams.push({ stream, videoEl: createVideoEl(stream) })
      } else if (mode === 'rear') {
        let stream
        try {
          stream = await safeGetUserMedia({
            video: { facingMode: { exact: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          })
        } catch {
          stream = await safeGetUserMedia({ video: true, audio: false })
        }
        streams.push({ stream, videoEl: createVideoEl(stream) })
      } else if (mode === 'dual') {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cams = devices.filter((d) => d.kind === 'videoinput')
        if (cams.length >= 2) {
          const streamA = await safeGetUserMedia({ video: { deviceId: cams[0].deviceId }, audio: false })
          const streamB = await safeGetUserMedia({ video: { deviceId: cams[1].deviceId }, audio: false })
          const vA = createVideoEl(streamA)
          const vB = createVideoEl(streamB)
          streams.push({ stream: streamA, videoEl: vA }, { stream: streamB, videoEl: vB })
          videoElements.push(vA, vB)
        } else {
          const stream = await safeGetUserMedia({ video: true, audio: false })
          streams.push({ stream, videoEl: createVideoEl(stream) })
        }
      } else if (mode === 'screen-pip') {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing tidak didukung perangkat ini.')
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 }, audio: true,
        })
        const camStream = await safeGetUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: false,
        })
        const screenEl = createVideoEl(screenStream)
        const camEl = createVideoEl(camStream)
        screenStream.getVideoTracks()[0].onended = () => {
          setErrorMessage('Screen share berakhir. Pilih sumber baru atau mulai ulang.')
          setLiveState('ended')
          setIsLive(false)
        }
        streams.push({ stream: screenStream, videoEl: screenEl }, { stream: camStream, videoEl: camEl })
        videoElements.push(screenEl, camEl)
      } else if (mode === 'screen-only') {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing tidak didukung perangkat ini.')
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 }, audio: true,
        })
        const screenEl = createVideoEl(screenStream)
        screenStream.getVideoTracks()[0].onended = () => {
          setErrorMessage('Screen share berakhir.')
          setLiveState('ended')
          setIsLive(false)
        }
        streams.push({ stream: screenStream, videoEl: screenEl })
      }
    } catch (error) {
      console.error('startLocalSources error', error)
      throw error
    }
    localStreamsRef.current = streams
    return videoElements.length ? videoElements : streams.map((s) => s.videoEl)
  }

  function stopLocalSources() {
    try {
      ;(localStreamsRef.current || []).forEach(({ stream, videoEl }) => {
        stream?.getTracks?.().forEach((track) => track.stop())
        if (videoEl && videoEl.parentElement) videoEl.parentElement.removeChild(videoEl)
      })
    } catch (error) {
      console.warn('stopLocalSources warning:', error)
    }
    localStreamsRef.current = []
  }

  const handleAudioReady = (audioStream) => {
    audioDestinationStreamRef.current = audioStream
    audioTrackRef.current = audioStream.getAudioTracks()[0] || null
  }

  /* ===== Rekaman Replay ===== */
  const startRecording = (stream) => {
    if (!window.MediaRecorder || !stream) return
    try {
      recordedChunksRef.current = []
      recSizeBytesRef.current = 0
      setRecordedSizeMB(0)
      const mime = pickVideoMime()
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 })
        : new MediaRecorder(stream, { videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 })
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
          recSizeBytesRef.current += e.data.size
          setRecordedSizeMB(+(recSizeBytesRef.current / 1024 / 1024).toFixed(2))
        }
      }
      rec.onerror = () => { setIsRecording(false) }
      rec.onstop = () => {
        setIsRecording(false)
        try {
          const chunks = recordedChunksRef.current || []
          if (chunks.length === 0) return
          const type = chunks[0]?.type || 'video/webm'
          const blob = new Blob(chunks, { type })
          const url = URL.createObjectURL(blob)
          const durationSec = startTsRef.current ? Math.floor((Date.now() - startTsRef.current) / 1000) : 0
          const title = `Live_${new Date().toLocaleString('id-ID').replace(/[\/,:\s]+/g, '_')}`
          // Ambil thumbnail (frame terakhir dari canvas)
          let thumbnailDataUrl = ''
          try {
            const canvas = mixedCanvasRef.current
            if (canvas) {
              const tmp = document.createElement('canvas')
              tmp.width = Math.min(canvas.width, 480)
              tmp.height = Math.round(tmp.width * (canvas.height / canvas.width))
              const ctx = tmp.getContext('2d')
              ctx.drawImage(canvas, 0, 0, tmp.width, tmp.height)
              thumbnailDataUrl = tmp.toDataURL('image/jpeg', 0.7)
            }
          } catch {}
          const meta = {
            id: 'replay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            title,
            sourceMode,
            durationSec,
            sizeMB: +(blob.size / 1024 / 1024).toFixed(2),
            createdAt: Date.now(),
            viewerCount,
            thumbnail: thumbnailDataUrl,
            blobUrl: url, // hanya berlaku untuk sesi ini
            mimeType: type,
            // Blob disimpan di IndexedDB via URL object tidak persist; kita simpan metadata saja.
            // User bisa klik Download untuk simpan sebagai file.
            _blobSize: blob.size,
          }
          // Simpan blob di memory map agar download/putar berfungsi
          if (!window.__novarixReplayBlobs) window.__novarixReplayBlobs = new Map()
          window.__novarixReplayBlobs.set(meta.id, blob)
          const all = loadReplays()
          all.unshift(meta)
          // Maks 20 replay teratas, total meta size < 4MB (thumbnail jpeg kecil aman)
          const trimmed = all.slice(0, 20)
          saveReplays(trimmed)
        } catch (e) {
          console.warn('Gagal menyimpan metadata replay:', e)
        }
      }
      rec.start(1000) // flush chunk per 1 detik (ramelan size up-to-date)
      recorderRef.current = rec
      setIsRecording(true)
    } catch (e) {
      console.warn('startRecording gagal:', e)
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    } catch (e) {
      console.warn('stopRecording warning:', e)
    }
    recorderRef.current = null
  }

  /* ===== Pause ===== */
  const handlePauseStream = () => {
    if (!isLive) return
    setIsPaused((prev) => {
      const next = !prev
      try {
        if (mixedVideoStreamRef.current) {
          mixedVideoStreamRef.current.getVideoTracks().forEach((t) => { try { t.enabled = !next } catch {} })
        }
        if (pcRef.current) {
          pcRef.current.getSenders().forEach((s) => {
            if (s.track && s.track.kind === 'video') { try { s.track.enabled = !next } catch {} }
          })
        }
        const preview = document.getElementById('live-preview')
        if (preview) {
          if (next) {
            const ov = document.createElement('div')
            Object.assign(ov.style, {
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '20px', fontWeight: 700,
            })
            ov.innerText = 'PAUSED'
            preview.appendChild(ov)
            previewOverlayRef.current = ov
          } else {
            if (previewOverlayRef.current?.parentElement) {
              previewOverlayRef.current.parentElement.removeChild(previewOverlayRef.current)
            }
            previewOverlayRef.current = null
          }
        }
      } catch (error) {
        console.warn('pause toggle failed', error)
      }
      return next
    })
  }

  const handleFollow = async (followed) => {
    try {
      if (!supabase || !user?.id) {
        setViewerCount((prev) => prev + (followed ? 1 : 0))
        return
      }
      if (followed) {
        await supabase.from('user_follows').insert({ follower_id: user.id, following_stream: streamId, created_at: new Date().toISOString() })
      } else {
        await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_stream', streamId)
      }
      setViewerCount((prev) => prev + (followed ? 1 : 0))
    } catch (err) {
      console.warn('follow action failed', err)
    }
  }

  async function previewSources(mode) {
    try {
      const videoEls = await startLocalSources(mode)
      if (!videoEls || videoEls.length === 0) return
      const layout = mode === 'dual' ? 'dual' : (mode === 'screen-pip' || mode === 'screen-only') ? 'pip' : 'single'
      const dims = qualityToDims(quality)
      const { mixedVideoStream, canvas } = await mixSourcesToCanvasStream({
        videoElements: videoEls, width: dims.width, height: dims.height, fps: dims.fps, layout, applyEffect: null
      })
      try { stopPreview() } catch (e) {}
      mixedVideoStreamRef.current = mixedVideoStream
      mixedCanvasRef.current = canvas
      const preview = document.getElementById('live-preview')
      if (preview) {
        preview.innerHTML = ''
        canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block'
        preview.appendChild(canvas)
        previewActiveRef.current = true
      }
    } catch (err) {
      console.error('previewSources error', err)
      setErrorMessage(err?.message || 'Unable to show preview')
    }
  }

  async function stopPreview() {
    try {
      if (mixedCanvasRef.current?.parentElement) mixedCanvasRef.current.parentElement.removeChild(mixedCanvasRef.current)
    } catch (e) {}
    try { if (mixedVideoStreamRef.current) mixedVideoStreamRef.current.getTracks().forEach((t) => t.stop()) } catch (e) {}
    mixedVideoStreamRef.current = null
    mixedCanvasRef.current = null
    previewActiveRef.current = false
  }

  async function startBroadcast() {
    const allowed = await requestCameraMicAccess()
    if (!allowed) { setLiveState('ended'); return }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Browser/device does not support media capture.')
      setLiveState('ended'); return
    }
    try {
      setErrorMessage('')
      setLiveState('connecting')
      setIsPaused(false)
      startTsRef.current = Date.now()
      setStats((prev) => ({ ...prev, durationSeconds: 0 }))
      setIsLive(true)
      setLiveState('live')

      const videoEls = await startLocalSources(sourceMode)
      if (!videoEls || videoEls.length === 0) throw new Error('No valid video source was detected for this device.')

      const layout = sourceMode === 'dual' ? 'dual' : (sourceMode === 'screen-pip' || sourceMode === 'screen-only') ? 'pip' : 'single'
      const dims = qualityToDims(quality)
      const { mixedVideoStream, canvas } = await mixSourcesToCanvasStream({
        videoElements: videoEls, width: dims.width, height: dims.height, fps: dims.fps, layout, applyEffect: null
      })
      mixedVideoStreamRef.current = mixedVideoStream
      mixedCanvasRef.current = canvas

      const preview = document.getElementById('live-preview')
      if (preview) {
        preview.innerHTML = ''
        canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block'
        preview.appendChild(canvas)
        previewActiveRef.current = true
      }

      let finalStream = null
      if (audioDestinationStreamRef.current && audioDestinationStreamRef.current.getAudioTracks().length > 0) {
        finalStream = new MediaStream()
        audioDestinationStreamRef.current.getAudioTracks().forEach((t) => finalStream.addTrack(t))
        mixedVideoStream.getVideoTracks().forEach((t) => finalStream.addTrack(t))
      } else {
        finalStream = mixedVideoStream
      }
      finalStreamRef.current = finalStream

      // Mulai rekaman Replay jika dicentang
      if (saveReplay) startRecording(finalStream)

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pcRef.current = pc
      pc.ontrack = () => {}
      healthIntervalRef.current = setInterval(() => collectStats(pc), 1000)
      finalStream.getTracks().forEach((track) => pc.addTrack(track, finalStream))
      if (isPaused) {
        try { finalStream.getVideoTracks().forEach((t) => { t.enabled = false }) } catch (e) {}
      }
      pc.onicecandidate = (event) => {
        if (event.candidate) signaling.emit('ice-candidate', { streamId, candidate: event.candidate })
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const answer = await new Promise((resolve, reject) => {
        signaling.emit('live:offer', { streamId, sdp: offer.sdp, type: offer.type }, (response) => {
          if (response?.error) return reject(new Error(response.error))
          resolve(response)
        })
      })
      await pc.setRemoteDescription({ type: answer.type || 'answer', sdp: answer.sdp })
    } catch (error) {
      console.error('startBroadcast error:', error)
      setErrorMessage(error.message || 'Unable to start live stream. Please check permissions and device availability.')
      setLiveState('ended')
      setIsLive(false)
    }
  }

  async function stopBroadcast() {
    // Hentikan rekaman dulu agar metadata capture akurat
    try { stopRecording() } catch {}
    try {
      if (pcRef.current) {
        try { pcRef.current.getSenders().forEach((sender) => sender.track?.stop?.()) } catch (e) { console.warn(e) }
        pcRef.current.close(); pcRef.current = null
      }
      if (healthIntervalRef.current) { clearInterval(healthIntervalRef.current); healthIntervalRef.current = null }
      stopLocalSources()
      if (audioDestinationStreamRef.current) {
        audioDestinationStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      audioDestinationStreamRef.current = null; audioTrackRef.current = null
      try {
        if (mixedVideoStreamRef.current) {
          mixedVideoStreamRef.current.getTracks().forEach((t) => t.stop())
          mixedVideoStreamRef.current = null
        }
        if (mixedCanvasRef.current?.parentElement) mixedCanvasRef.current.parentElement.removeChild(mixedCanvasRef.current)
        mixedCanvasRef.current = null
        if (previewOverlayRef.current?.parentElement) previewOverlayRef.current.parentElement.removeChild(previewOverlayRef.current)
        previewOverlayRef.current = null
      } catch (e) { console.warn('error while stopping preview', e) }
      previewActiveRef.current = false
      startTsRef.current = null
      finalStreamRef.current = null
      setIsPaused(false); setIsLive(false); setLiveState('ended'); setStats(DEFAULT_STATS)
      setRecordedSizeMB(0)
    } catch (error) {
      console.warn('stopBroadcast error:', error)
    }
  }

  const collectStats = async (pc) => {
    if (!pc) return
    try {
      const reports = await pc.getStats()
      let bitrate = 0, droppedFrames = 0, rtt = 0
      reports.forEach((report) => {
        if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
          bitrate = report.bytesSent ? report.bytesSent * 8 : bitrate
          if (typeof report.framesDropped === 'number') droppedFrames = report.framesDropped
        }
        if (report.type === 'candidate-pair' && report.nominated && typeof report.currentRoundTripTime === 'number') {
          rtt = report.currentRoundTripTime * 1000
        }
      })
      const durationSeconds = startTsRef.current ? Math.floor((Date.now() - startTsRef.current) / 1000) : 0
      const qualityScore = bitrate > 3500000 ? 'Excellent' : bitrate > 1500000 ? 'Good' : bitrate > 700000 ? 'Fair' : 'Weak'
      setStats({ bitrate, droppedFrames, rtt, durationSeconds })
      setNetworkQuality(qualityScore)
    } catch (error) { console.warn('collectStats error:', error) }
  }

  const qualityToDims = (q) => {
    switch (q) {
      case '1440p': return { width: 2560, height: 1440, fps: 30 }
      case '2160p': return { width: 3840, height: 2160, fps: 30 }
      case '4320p': return { width: 7680, height: 4320, fps: 30 }
      case '1080p': default: return { width: 1920, height: 1080, fps: 30 }
    }
  }

  const handleSourceSelect = (mode) => {
    const fullList = sourceModes.concat(['screen-only'])
    if (!fullList.includes(mode)) {
      setSourceMode(sourceModes[0] || 'front'); return
    }
    setSourceMode(mode)
    setShowSettings(false)
  }

  /* Ganti source dengan tombol cepat (termasuk switch camera depan<->belakang saat live) */
  const quickSwitchSource = useCallback(async (mode) => {
    if (!fullSourceList().includes(mode)) return
    setSourceMode(mode)
    if (isLive) {
      // Restart stream dengan source baru
      try { stopBroadcast() } catch {}
      setTimeout(() => startBroadcast(), 350)
    } else {
      try { await previewSources(mode) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive])

  const fullSourceList = () => sourceModes.concat(deviceProfile.canScreenShare ? ['screen-only'] : [])

  return (
    <div className="min-h-screen w-full bg-[#0b0b0e] text-white">
      <div className="px-4 sm:px-6 py-4 max-w-[1600px] mx-auto">
        {/* ===== Header Studio ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <RadioTower className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Novarix Live Studio</h1>
              <p className="text-xs text-neutral-400">Stream ID: {streamId || 'preview-mode'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveReplay}
                onChange={(e) => setSaveReplay(e.target.checked)}
                className="accent-cyan-500"
              />
              <Disc3 className={`w-4 h-4 ${saveReplay ? 'text-cyan-400 animate-pulse' : 'text-neutral-500'}`} />
              <span>Rekam sebagai Replay</span>
            </label>
            <Link
              to="/live/replays"
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 hover:text-cyan-300 transition"
            >
              <RotateCcw className="w-4 h-4"/> Arsip Replay
            </Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* ===== Preview + Sources ===== */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Preview Card */}
            <div className="relative rounded-2xl bg-black border border-neutral-800 shadow-2xl overflow-hidden aspect-video w-full">
              <div id="live-preview" className="w-full h-full"/>
              {/* Top Left: Status + ControlPanel */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {isLive && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/90 text-white text-[11px] font-black tracking-wider shadow-lg">
                    <Radio className="w-3.5 h-3.5 animate-pulse"/> LIVE {isRecording && <span>● REC {recordedSizeMB}MB</span>}
                  </div>
                )}
                <LiveControlPanel
                  isLive={isLive}
                  liveState={liveState}
                  onGoLive={startBroadcast}
                  onEndLive={stopBroadcast}
                  onPauseStream={handlePauseStream}
                  onFollow={handleFollow}
                  stats={stats}
                  quality={quality}
                  onQualityChange={setQuality}
                  networkQuality={networkQuality}
                  errorMessage={errorMessage}
                  viewerCount={viewerCount}
                  isPaused={isPaused}
                />
              </div>

              <div className="absolute top-3 right-3">
                <EffectsLibrary selected={selectedEffect} onSelect={setSelectedEffect} />
              </div>

              {/* Bottom bar: quick sources */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 flex-wrap">
                <div className="bg-[#0b0b0e]/90 backdrop-blur rounded-xl border border-neutral-800 p-2 flex flex-wrap gap-2">
                  {deviceProfile.hasFrontCamera && (
                    <SourceChip
                      active={sourceMode === 'front'}
                      onClick={() => quickSwitchSource('front')}
                      Icon={Video}
                      label="Kamera Depan"
                      sub="PC / HP"
                    />
                  )}
                  {deviceProfile.hasRearCamera && (
                    <SourceChip
                      active={sourceMode === 'rear'}
                      onClick={() => quickSwitchSource('rear')}
                      Icon={Camera}
                      label="Kamera Belakang"
                      sub="HP only"
                    />
                  )}
                  {deviceProfile.canScreenShare && (
                    <SourceChip
                      active={sourceMode === 'screen-only'}
                      onClick={() => quickSwitchSource('screen-only')}
                      Icon={MonitorPlay}
                      label="Layar"
                      sub="Screen Share"
                    />
                  )}
                  {sourceModes.includes('screen-pip') && (
                    <SourceChip
                      active={sourceMode === 'screen-pip'}
                      onClick={() => quickSwitchSource('screen-pip')}
                      Icon={MonitorPlay}
                      label="Layar + Cam"
                      sub="PiP"
                    />
                  )}
                  {deviceProfile.hasDualCam && sourceModes.includes('dual') && (
                    <SourceChip
                      active={sourceMode === 'dual'}
                      onClick={() => quickSwitchSource('dual')}
                      Icon={Camera}
                      label="Dual Cam"
                      sub="2 kamera"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-neutral-900/90 backdrop-blur border border-neutral-800 hover:border-neutral-700 transition"
                  >
                    <Camera className="w-4 h-4"/> Sources
                  </button>
                  <button
                    onClick={requestCameraMicAccess}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black transition shadow"
                  >
                    Izinkan Kamera & Mic
                  </button>
                  {isLive && (
                    <button
                      onClick={stopBroadcast}
                      className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white transition shadow-lg"
                    >
                      End Live
                    </button>
                  )}
                </div>
              </div>

              {/* Mic Panel */}
              <div className="absolute -bottom-1 left-3 translate-y-full mt-3">
                <MicrophonePanel audioTrackRef={audioTrackRef} onAudioStreamReady={handleAudioReady} />
              </div>
              <DonationAlertOverlay streamId={streamId} />
            </div>

            {/* Stats card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatChip label="Bitrate" value={`${Math.round((stats.bitrate || 0) / 1000)} kbps`} sub="Upload"/>
              <StatChip label="Dropped" value={`${stats.droppedFrames || 0}`} sub="Frames"/>
              <StatChip label="RTT" value={`${Math.round(stats.rtt || 0)} ms`} sub="Latency"/>
              <StatChip label="Kualitas" value={networkQuality} sub={isLive ? 'Jaringan' : 'Idle'}/>
            </div>
          </div>

          {/* ===== Sidebar: Chat ===== */}
          <aside className="w-full lg:w-[340px] shrink-0 space-y-3">
            <div className="rounded-2xl bg-[#141418] border border-neutral-800 p-3.5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Viewers</div>
                <div className="text-2xl font-black">{viewerCount.toLocaleString('id-ID')}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-xs font-bold text-emerald-400">{isLive ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <LiveChatPanel viewerCount={viewerCount} streamId={streamId} currentUser={user} />
          </aside>
        </div>
      </div>

      <CameraSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSelectSource={handleSourceSelect}
        current={sourceMode}
        sourceModes={fullSourceList()}
      />
    </div>
  )
}

/* ===== Subcomponents ===== */
const SourceChip = ({ Icon, label, sub, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={
      'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
      (active
        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow'
        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800')
    }
  >
    <Icon className="w-4 h-4"/>
    <div className="text-left leading-tight">
      <div>{label}</div>
      <div className={active ? 'text-white/80' : 'text-neutral-500'} style={{ fontSize: 10, fontWeight: 600 }}>{sub}</div>
    </div>
  </button>
)

const StatChip = ({ label, value, sub }) => (
  <div className="rounded-2xl bg-[#141418] border border-neutral-800 px-4 py-3">
    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
    <div className="mt-0.5 text-lg font-black text-white">{value}</div>
    <div className="text-[10px] text-neutral-500 font-semibold">{sub}</div>
  </div>
)

export default LiveStudio
