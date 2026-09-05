import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { postsApi, api } from '../services/api'
import {
  ArrowLeft, SwitchCamera, Camera, Video, Image, MapPin,
  X, Check, Send, Smile, Users, Globe2, Lock, EyeOff,
  FlipHorizontal, Zap, ZapOff, Music, Timer, Grid3X3,
} from 'lucide-react'

const Create = () => {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const recordTimerRef = useRef(null)

  // Camera state
  const [mode, setMode] = useState('photo') // photo | video
  const [facing, setFacing] = useState('environment')
  const [flash, setFlash] = useState(false)
  const [stream, setStream] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState('')

  // Capture state
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [capturedVideo, setCapturedVideo] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [capturedFiles, setCapturedFiles] = useState([])

  // Post editor state (after capture)
  const [step, setStep] = useState('camera') // camera | editor
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationResults, setLocationResults] = useState([])
  const [privacy, setPrivacy] = useState('public')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === 'video',
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }
      setCameraReady(true)
      setError('')
    } catch (err) {
      setError('Kamera tidak tersedia. Coba gunakan galeri untuk upload.')
      console.error('Camera error:', err)
    }
  }, [facing, mode])

  useEffect(() => {
    if (step === 'camera') {
      startCamera()
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [step, facing, mode, startCamera])

  // Flip camera
  const flipCamera = () => {
    setFacing(f => f === 'environment' ? 'user' : 'environment')
  }

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1920
    canvas.height = video.videoHeight || 1080
    const ctx = canvas.getContext('2d')
    if (facing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
        const preview = URL.createObjectURL(blob)
        setCapturedPhoto(preview)
        setCapturedFiles(prev => [...prev, { file, preview, type: 'image' }])
        setStep('editor')
        stopCamera()
      }
    }, 'image/jpeg', 0.95)
  }

  // Start/stop video recording
  const toggleRecording = () => {
    if (isRecording) {
      recorderRef.current?.stop()
      setIsRecording(false)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      setRecordTime(0)
      return
    }

    if (!stream) return
    try {
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm' })
      recorderRef.current = mr
      const chunks = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' })
        const preview = URL.createObjectURL(blob)
        setCapturedVideo(preview)
        setCapturedFiles(prev => [...prev, { file, preview, type: 'video' }])
        setStep('editor')
        stopCamera()
      }
      mr.start()
      setIsRecording(true)
      setRecordTime(0)
      const start = Date.now()
      recordTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000)
        setRecordTime(elapsed)
        if (elapsed >= 60) { mr.stop() } // max 60s
      }, 500)
    } catch (err) {
      console.error('Recording failed:', err)
    }
  }

  // Pick from gallery
  const pickFromGallery = () => {
    fileInputRef.current?.click()
  }

  const handleGalleryPick = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const file = files[0]
    const preview = URL.createObjectURL(file)
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    setCapturedFiles([{ file, preview, type }])
    if (type === 'image') setCapturedPhoto(preview)
    else setCapturedVideo(preview)
    setStep('editor')
    stopCamera()
    e.target.value = ''
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setStream(null)
    setCameraReady(false)
  }

  // Retake
  const retake = () => {
    capturedFiles.forEach(f => URL.revokeObjectURL(f.preview))
    setCapturedFiles([])
    setCapturedPhoto(null)
    setCapturedVideo(null)
    setCaption('')
    setLocation('')
    setStep('camera')
  }

  // Search location
  const searchLocation = async (q) => {
    setLocationSearch(q)
    if (!q || q.length < 2) { setLocationResults([]); return }
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
      setLocationResults([])
    } catch {
      setLocationResults([])
    }
  }

  // Post
  const handlePost = async () => {
    if (capturedFiles.length === 0) return
    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      capturedFiles.forEach(({ file }) => formData.append('media', file))
      formData.append('caption', caption)
      formData.append('privacy', privacy)
      formData.append('location', location)
      formData.append('createdAt', new Date().toISOString())
      formData.append('timestamp', String(Date.now()))

      await postsApi.createPost(formData, (pct) => setProgress(pct))
      capturedFiles.forEach(f => URL.revokeObjectURL(f.preview))
      setCapturedFiles([])
      setCapturedPhoto(null)
      setCapturedVideo(null)
      setCaption('')
      setLocation('')
      navigate('/feed')
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal posting')
    } finally {
      setUploading(false)
    }
  }

  const formatRecordTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const canPost = capturedFiles.length > 0 && !uploading

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[15px] font-semibold">
          {step === 'camera' ? 'Buat Postingan' : 'Edit & Posting'}
        </h1>
        {step === 'editor' ? (
          <button onClick={retake} className="text-sm text-emerald-400 font-semibold hover:text-emerald-300">
            Ulangi
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* ===== CAMERA STEP ===== */}
      {step === 'camera' && (
        <div className="flex-1 flex flex-col pt-14">
          {/* Camera viewfinder */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {error ? (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-white/30" />
                </div>
                <p className="text-white/50 text-sm max-w-xs">{error}</p>
                <button onClick={pickFromGallery} className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition">
                  Pilih dari Galeri
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Top controls */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <button onClick={flipCamera} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition">
                    <SwitchCamera className="w-5 h-5" />
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFlash(f => !f)}
                      className={`w-10 h-10 rounded-full backdrop-blur flex items-center justify-center transition ${flash ? 'bg-yellow-500/80' : 'bg-black/40 hover:bg-black/60'}`}
                    >
                      {flash ? <Zap className="w-5 h-5 text-black" /> : <ZapOff className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/90 z-10">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    <span className="text-sm font-mono font-bold">{formatRecordTime(recordTime)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom controls */}
          <div className="shrink-0 bg-black px-4 py-4 pb-20 sm:pb-4">
            {/* Mode switcher */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => setMode('photo')}
                className={`text-sm font-semibold transition ${mode === 'photo' ? 'text-white' : 'text-white/40'}`}
              >
                Foto
              </button>
              <button
                onClick={() => setMode('video')}
                className={`text-sm font-semibold transition ${mode === 'video' ? 'text-white' : 'text-white/40'}`}
              >
                Video
              </button>
            </div>

            {/* Capture buttons */}
            <div className="flex items-center justify-center gap-8">
              {/* Gallery */}
              <button onClick={pickFromGallery} className="w-12 h-12 rounded-xl border-2 border-white/20 overflow-hidden hover:border-white/40 transition">
                {capturedFiles.length > 0 ? (
                  <img src={capturedFiles[0].preview} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-white/60" />
                  </div>
                )}
              </button>

              {/* Shutter / Record */}
              {mode === 'photo' ? (
                <button onClick={capturePhoto} className="w-[72px] h-[72px] rounded-full border-[4px] border-white/30 flex items-center justify-center hover:scale-105 active:scale-95 transition">
                  <div className="w-[58px] h-[58px] rounded-full bg-white hover:bg-white/90 transition" />
                </button>
              ) : (
                <button
                  onClick={toggleRecording}
                  className={`w-[72px] h-[72px] flex items-center justify-center transition hover:scale-105 active:scale-95 ${
                    isRecording ? 'rounded-2xl bg-red-500' : 'rounded-full border-[4px] border-red-500/30'
                  }`}
                >
                  {isRecording ? (
                    <div className="w-6 h-6 rounded-sm bg-white" />
                  ) : (
                    <div className="w-[58px] h-[58px] rounded-full bg-red-500" />
                  )}
                </button>
              )}

              {/* Flip camera */}
              <button onClick={flipCamera} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                <FlipHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDITOR STEP ===== */}
      {step === 'editor' && (
        <div className="flex-1 flex flex-col pt-14 overflow-y-auto bg-[#0b0b0e]">
          {/* Preview */}
          <div className="shrink-0 bg-black">
            {capturedPhoto && (
              <img src={capturedPhoto} alt="Captured" className="w-full max-h-[50vh] object-contain" />
            )}
            {capturedVideo && (
              <video src={capturedVideo} controls className="w-full max-h-[50vh] object-contain" />
            )}
          </div>

          {/* Editor form */}
          <div className="flex-1 px-4 py-4 space-y-4">
            {/* Caption */}
            <div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tulis caption..."
                rows={3}
                className="w-full bg-[#1a1a20] border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>

            {/* Location */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-[#1a1a20] border border-neutral-800 rounded-xl px-4 py-3">
                <MapPin className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Tambahkan lokasi..."
                  className="flex-1 bg-transparent text-sm text-neutral-200 placeholder-neutral-500 outline-none"
                />
                {location && (
                  <button onClick={() => setLocation('')} className="text-neutral-500 hover:text-neutral-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Privacy */}
            <div className="flex items-center gap-3 bg-[#1a1a20] border border-neutral-800 rounded-xl px-4 py-3">
              {privacy === 'public' && <Globe2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />}
              {privacy === 'friends' && <Users className="w-4.5 h-4.5 text-sky-400 shrink-0" />}
              {privacy === 'private' && <Lock className="w-4.5 h-4.5 text-amber-400 shrink-0" />}
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="flex-1 bg-transparent text-sm text-neutral-200 outline-none cursor-pointer"
              >
                <option value="public" className="bg-[#1a1a20]">Publik — Semua orang</option>
                <option value="friends" className="bg-[#1a1a20]">Teman — Teman saja</option>
                <option value="private" className="bg-[#1a1a20]">Privat — Hanya saya</option>
              </select>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-neutral-500 text-center">{progress}% mengunggah...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Post button */}
          <div className="shrink-0 px-4 py-4 pb-20 sm:pb-4 border-t border-neutral-800/50">
            <button
              onClick={handlePost}
              disabled={!canPost}
              className={`w-full py-3.5 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition ${
                canPost
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4.5 h-4.5" />
              {uploading ? `Mengunggah ${progress}%` : 'Posting'}
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleGalleryPick}
      />
    </div>
  )
}

export default Create
